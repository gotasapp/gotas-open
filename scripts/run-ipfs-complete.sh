#!/bin/bash

# Script para executar extração IPFS completa em background

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$APP_DIR/ipfs-daemon.pid"
LOG_FILE="$APP_DIR/logs/ipfs-complete-daemon.log"

# Criar diretório de logs
mkdir -p "$APP_DIR/logs"

echo "🚀 Iniciando IPFS Complete Daemon..."
echo "📁 Diretório: $APP_DIR"
echo "📄 Log: $LOG_FILE"
echo "🆔 PID será salvo em: $PID_FILE"

# Navegar para o diretório da aplicação
cd "$APP_DIR"

# Verificar se já está rodando
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "⚠️  Daemon já está rodando (PID: $OLD_PID)"
        echo "Para parar: kill $OLD_PID"
        exit 1
    else
        echo "🗑️  Removendo PID file obsoleto"
        rm -f "$PID_FILE"
    fi
fi

# Executar em background e salvar PID
nohup node scripts/ipfs-complete-daemon.js > "$LOG_FILE" 2>&1 &
DAEMON_PID=$!

# Salvar PID
echo "$DAEMON_PID" > "$PID_FILE"

echo "✅ Daemon iniciado com PID: $DAEMON_PID"
echo ""
echo "📊 Para monitorar o progresso:"
echo "   tail -f $LOG_FILE"
echo ""
echo "⏹️  Para parar o daemon:"
echo "   kill $DAEMON_PID"
echo "   rm $PID_FILE"
echo ""
echo "🔍 Para verificar se está rodando:"
echo "   kill -0 $DAEMON_PID && echo 'Rodando' || echo 'Parado'"

# Aguardar um pouco e mostrar início do log
sleep 3
echo ""
echo "📝 Últimas linhas do log:"
tail -n 10 "$LOG_FILE"