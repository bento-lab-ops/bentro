package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"retro-app/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// UserConnection tracks which board and user a connection belongs to
type UserConnection struct {
	BoardID  string
	Username string
}

// ParticipantMessage represents a join/leave message
type ParticipantMessage struct {
	Type     string          `json:"type"`
	BoardID  string          `json:"board_id"`
	Username string          `json:"username"`
	Avatar   string          `json:"avatar"`
	Conn     *websocket.Conn `json:"-"`
}

// Hub maintains active WebSocket connections
type Hub struct {
	clients           map[*websocket.Conn]bool
	boardParticipants map[string]map[string]models.Participant // boardID -> username -> Participant
	connToUser        map[*websocket.Conn]UserConnection       // conn -> UserConnection
	broadcast         chan []byte
	register          chan *websocket.Conn
	unregister        chan *websocket.Conn
	joinBoard         chan *ParticipantMessage
	leaveBoard        chan *ParticipantMessage
	mutex             sync.RWMutex
}

// Global hub instance
var hub = &Hub{
	clients:           make(map[*websocket.Conn]bool),
	boardParticipants: make(map[string]map[string]models.Participant),
	connToUser:        make(map[*websocket.Conn]UserConnection),
	broadcast:         make(chan []byte),
	register:          make(chan *websocket.Conn),
	unregister:        make(chan *websocket.Conn),
	joinBoard:         make(chan *ParticipantMessage),
	leaveBoard:        make(chan *ParticipantMessage),
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case conn := <-h.register:
			h.mutex.Lock()
			h.clients[conn] = true
			h.mutex.Unlock()
			log.Printf("Client connected. Total clients: %d", len(h.clients))

		case conn := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[conn]; ok {
				// Remove from participants if exists
				if userConn, exists := h.connToUser[conn]; exists {
					h.removeParticipant(userConn.BoardID, userConn.Username)
					delete(h.connToUser, conn)
					h.broadcastParticipants(userConn.BoardID)
				}
				delete(h.clients, conn)
				conn.Close()
			}
			h.mutex.Unlock()
			log.Printf("Client disconnected. Total clients: %d", len(h.clients))

		case msg := <-h.joinBoard:
			h.mutex.Lock()
			if _, ok := h.boardParticipants[msg.BoardID]; !ok {
				h.boardParticipants[msg.BoardID] = make(map[string]models.Participant)
			}
			h.boardParticipants[msg.BoardID][msg.Username] = models.Participant{
				Username: msg.Username,
				Avatar:   msg.Avatar,
			}
			h.connToUser[msg.Conn] = UserConnection{
				BoardID:  msg.BoardID,
				Username: msg.Username,
			}
			h.mutex.Unlock()
			h.broadcastParticipants(msg.BoardID)

		case msg := <-h.leaveBoard:
			h.mutex.Lock()
			h.removeParticipant(msg.BoardID, msg.Username)
			if userConn, exists := h.connToUser[msg.Conn]; exists && userConn.BoardID == msg.BoardID && userConn.Username == msg.Username {
				delete(h.connToUser, msg.Conn)
			}
			h.mutex.Unlock()
			h.broadcastParticipants(msg.BoardID)

		case message := <-h.broadcast:
			h.mutex.RLock()
			for conn := range h.clients {
				err := conn.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					log.Printf("Error broadcasting to client: %v", err)
					conn.Close()
					delete(h.clients, conn)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func (h *Hub) removeParticipant(boardID, username string) {
	if participants, ok := h.boardParticipants[boardID]; ok {
		delete(participants, username)
		if len(participants) == 0 {
			delete(h.boardParticipants, boardID)
		}
	}
}

func (h *Hub) broadcastParticipants(boardID string) {
	h.mutex.RLock()
	participantsMap, ok := h.boardParticipants[boardID]
	h.mutex.RUnlock()

	if !ok {
		participantsMap = make(map[string]models.Participant)
	}

	participants := make([]models.Participant, 0, len(participantsMap))
	for _, p := range participantsMap {
		participants = append(participants, p)
	}

	data := map[string]interface{}{
		"board_id":     boardID,
		"participants": participants,
	}
	BroadcastMessage("participants_update", data)
}

// GetBoardParticipants returns the list of participants for a board
func (h *Hub) GetBoardParticipants(boardID string) []models.Participant {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	participantsMap, ok := h.boardParticipants[boardID]
	if !ok {
		return []models.Participant{}
	}

	participants := make([]models.Participant, 0, len(participantsMap))
	for _, p := range participantsMap {
		participants = append(participants, p)
	}
	return participants
}

// BroadcastMessage sends a message to all connected clients
func BroadcastMessage(messageType string, data interface{}) {
	message := map[string]interface{}{
		"type": messageType,
		"data": data,
	}
	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling broadcast message: %v", err)
		return
	}
	hub.broadcast <- jsonData
}

// HandleWebSocket handles WebSocket connections
func HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	hub.register <- conn

	// Read messages from client
	go func() {
		defer func() {
			hub.unregister <- conn
		}()

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket error: %v", err)
				}
				break
			}

			// Handle join/leave messages
			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err == nil {
				msgType, _ := msg["type"].(string)
				if msgType == "join_board" {
					boardID, _ := msg["board_id"].(string)
					username, _ := msg["username"].(string)
					avatar, _ := msg["avatar"].(string)
					if boardID != "" && username != "" {
						hub.joinBoard <- &ParticipantMessage{
							Type:     "join_board",
							BoardID:  boardID,
							Username: username,
							Avatar:   avatar,
							Conn:     conn,
						}
					}
				} else if msgType == "leave_board" {
					boardID, _ := msg["board_id"].(string)
					username, _ := msg["username"].(string)
					if boardID != "" && username != "" {
						hub.leaveBoard <- &ParticipantMessage{
							Type:     "leave_board",
							BoardID:  boardID,
							Username: username,
							Conn:     conn,
						}
					}
				}
			}

			// Echo message back to all clients (for timer sync, etc.)
			hub.broadcast <- message
		}
	}()
}

// InitWebSocketHub initializes and starts the WebSocket hub
func InitWebSocketHub() {
	go hub.Run()
}
