#!/bin/bash

# Script para executar extração IPFS em background com logs

LOG_FILE="ipfs-extraction-$(date +%Y%m%d-%H%M%S).log"

echo "Starting IPFS extraction process..."
echo "Log file: $LOG_FILE"
echo "Process will run in background. Check progress with: tail -f $LOG_FILE"

# Executar em background com nohup
nohup node scripts/extract-ipfs-images-batch.js > "$LOG_FILE" 2>&1 &

# Pegar o PID
PID=$!
echo "Process started with PID: $PID"
echo "PID: $PID" > ipfs-extraction.pid

# Mostrar primeiras linhas do log
sleep 2
echo ""
echo "Initial output:"
head -20 "$LOG_FILE"

echo ""
echo "Commands:"
echo "  Check progress: tail -f $LOG_FILE"
echo "  Check checkpoint: cat ipfs-extraction-checkpoint.json | jq"
echo "  Stop process: kill $PID"
echo "  Check if running: ps -p $PID"