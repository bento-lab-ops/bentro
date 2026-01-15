package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 1024
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte

	// Board and User context
	boardID  string
	username string
}

// readPump pumps messages from the websocket connection to the hub.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Process Message Here or Forward to Hub
		// For our app, we process join/leave/phase logic directly here or via the hub
		// To match previous logic, we will inspect the message content here

		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err == nil {
			msgType, _ := msg["type"].(string)

			if msgType == "join_board" {
				boardID, _ := msg["board_id"].(string)
				username, _ := msg["username"].(string)
				avatar, _ := msg["avatar"].(string)
				if boardID != "" && username != "" {
					isAdmin, _ := msg["is_admin"].(bool)

					// Update Client Context
					c.boardID = boardID
					c.username = username

					c.hub.joinBoard <- &ParticipantMessage{
						Type:     "join_board",
						BoardID:  boardID,
						Username: username,
						Avatar:   avatar,
						IsAdmin:  isAdmin,
						Client:   c,
					}
				}
			} else if msgType == "leave_board" {
				boardID, _ := msg["board_id"].(string)
				username, _ := msg["username"].(string)
				if boardID != "" && username != "" {
					c.hub.leaveBoard <- &ParticipantMessage{
						Type:     "leave_board",
						BoardID:  boardID,
						Username: username,
						Client:   c,
					}
				}
			} else if msgType == "phase_change" {
				if boardID, ok := msg["board_id"].(string); ok {
					if phase, ok := msg["phase"].(string); ok && boardID != "" {
						if err := database.DB.Model(&models.Board{}).Where("id = ?", boardID).Update("phase", phase).Error; err != nil {
							log.Printf("Failed to update board phase: %v", err)
						}
					}
				}
			}
		}

		// In standard Chat example, we broadcast everything back.
		// In our app, 'broadcast' channel expects encoded JSON.
		c.hub.broadcast <- message
	}
}

// writePump pumps messages from the hub to the websocket connection.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ParticipantMessage now typically just carries data, but needed for hub join/leave channels
type ParticipantMessage struct {
	Type     string  `json:"type"`
	BoardID  string  `json:"board_id"`
	Username string  `json:"username"`
	Avatar   string  `json:"avatar"`
	IsAdmin  bool    `json:"is_admin"`
	Client   *Client `json:"-"`
}

// Hub maintains active WebSocket connections
type Hub struct {
	clients           map[*Client]bool
	boardParticipants map[string]map[string]models.Participant // boardID -> username -> Participant
	broadcast         chan []byte
	register          chan *Client
	unregister        chan *Client
	joinBoard         chan *ParticipantMessage
	leaveBoard        chan *ParticipantMessage
	mutex             sync.RWMutex
}

// Global hub instance
var hub = &Hub{
	clients:           make(map[*Client]bool),
	boardParticipants: make(map[string]map[string]models.Participant),
	broadcast:         make(chan []byte),
	register:          make(chan *Client),
	unregister:        make(chan *Client),
	joinBoard:         make(chan *ParticipantMessage),
	leaveBoard:        make(chan *ParticipantMessage),
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			log.Printf("Client connected. Total clients: %d", len(h.clients))

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				// Cleanup participation
				if client.boardID != "" && client.username != "" {
					h.removeParticipant(client.boardID, client.username)
					h.broadcastParticipants(client.boardID)
				}
				delete(h.clients, client)
				close(client.send)
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
				IsAdmin:  msg.IsAdmin,
			}
			h.mutex.Unlock()
			h.broadcastParticipants(msg.BoardID)

		case msg := <-h.leaveBoard:
			h.mutex.Lock()
			h.removeParticipant(msg.BoardID, msg.Username)
			h.mutex.Unlock()
			h.broadcastParticipants(msg.BoardID)

		case message := <-h.broadcast:
			// Non-blocking broadcast
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
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

// Public Methods maintained for compatibility

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

// GetParticipantCount returns the number of active participants for a board
func (h *Hub) GetParticipantCount(boardID string) int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	if participants, ok := h.boardParticipants[boardID]; ok {
		return len(participants)
	}
	return 0
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

	client := &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
	}
	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}

// InitWebSocketHub initializes and starts the WebSocket hub
func InitWebSocketHub() {
	go hub.Run()
}

// BroadcastBoardUpdate sends the updated board data to all connected clients
func BroadcastBoardUpdate(boardID uuid.UUID) {
	data := map[string]interface{}{
		"board_id": boardID.String(),
		"action":   "refresh_board",
	}
	BroadcastMessage("board_update", data)
}
