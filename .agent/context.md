# Contexto do Ambiente de Desenvolvimento

## Container Runtime
- **Ferramenta**: `nerdctl` (NÃO usar `docker`)
- **Motivo**: Este ambiente usa nerdctl como runtime de containers

## Comandos de Build
Para build de imagens, usar:
```bash
nerdctl build -t dnlouko/bentro-app:v0.2.X .
```

## Nomenclatura de Imagens
- **Prefixo**: `dnlouko/bentro-app`
- **Formato de tag**: `v0.2.X` (seguindo versionamento semântico)
- **Exemplo completo**: `dnlouko/bentro-app:v0.2.8`

## Kubernetes
- **Namespace**: `bentro`
- **Comandos kubectl**: SEMPRE usar `-n bentro` ou `--namespace=bentro`
- **Exemplo**: `kubectl get pods -n bentro`
