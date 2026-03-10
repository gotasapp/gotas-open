#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configurações
const CHECKPOINT_FILE = './ipfs-extraction-checkpoint.json';
const LOG_DIR = './logs';
const MONITOR_INTERVAL = 30000; // 30 segundos
const RESTART_DELAY = 10000; // 10 segundos
const COMPLETION_CHECK_INTERVAL = 60000; // 1 minuto

// Estado do daemon
let extractionProcess = null;
let isRunning = false;
let lastProgressTime = Date.now();
let lastProcessedCount = 0;
let completionCheckInterval = null;

// Criar diretório de logs
async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (e) {}
}

// Função para ler checkpoint
async function readCheckpoint() {
  try {
    const data = await fs.readFile(CHECKPOINT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

// Mostrar progresso
function showProgress(checkpoint) {
  if (!checkpoint) return;
  
  const percent = ((checkpoint.processed / checkpoint.total) * 100).toFixed(2);
  const progressBar = '█'.repeat(Math.floor(percent / 2.5)) + '░'.repeat(40 - Math.floor(percent / 2.5));
  
  console.log(`\n📊 Progresso da Extração IPFS`);
  console.log(`[${progressBar}] ${percent}%`);
  console.log(`Processados: ${checkpoint.processed}/${checkpoint.total}`);
  console.log(`Atualizados: ${checkpoint.updated}`);
  console.log(`Erros: ${checkpoint.errors}`);
  
  if (checkpoint.processed > 0) {
    const rate = checkpoint.processed / ((Date.now() - new Date(checkpoint.startTime).getTime()) / 1000);
    const remaining = checkpoint.total - checkpoint.processed;
    const etaMinutes = Math.ceil((remaining / rate) / 60);
    console.log(`Taxa: ${rate.toFixed(1)} assets/seg`);
    console.log(`Tempo restante: ~${etaMinutes} minutos`);
  }
  
  console.log(`Última atualização: ${new Date().toLocaleString('pt-BR')}`);
}

// Iniciar processo de extração
async function startExtraction() {
  if (isRunning) return;
  
  console.log('\n🚀 Iniciando processo de extração IPFS...');
  
  extractionProcess = spawn('node', ['scripts/extract-ipfs-images-batch.js'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  isRunning = true;
  lastProgressTime = Date.now();
  
  // Monitorar saída do processo
  extractionProcess.stdout.on('data', (data) => {
    // Atualizar tempo da última atividade
    lastProgressTime = Date.now();
  });
  
  extractionProcess.stderr.on('data', (data) => {
    console.error(`Erro: ${data}`);
  });
  
  extractionProcess.on('close', (code) => {
    console.log(`\n⚠️  Processo encerrado com código: ${code}`);
    isRunning = false;
    extractionProcess = null;
    
    // Reagendar restart
    setTimeout(startExtraction, RESTART_DELAY);
  });
  
  extractionProcess.on('error', (error) => {
    console.error(`Erro no processo: ${error.message}`);
    isRunning = false;
    extractionProcess = null;
    
    // Reagendar restart
    setTimeout(startExtraction, RESTART_DELAY);
  });
}

// Verificar se o processo está travado
function checkProgress() {
  const timeSinceLastProgress = Date.now() - lastProgressTime;
  
  // Se não houve atividade por mais de 5 minutos, reiniciar
  if (timeSinceLastProgress > 300000 && isRunning) {
    console.log('\n⚠️  Processo parece travado. Reiniciando...');
    if (extractionProcess) {
      extractionProcess.kill();
    }
  }
}

// Verificar se completou
async function checkCompletion() {
  const checkpoint = await readCheckpoint();
  
  if (checkpoint) {
    showProgress(checkpoint);
    
    // Verificar se houve progresso
    if (checkpoint.processed !== lastProcessedCount) {
      lastProcessedCount = checkpoint.processed;
      lastProgressTime = Date.now();
    }
    
    // Verificar se completou
    if (checkpoint.processed >= checkpoint.total) {
      console.log('\n🎉 EXTRAÇÃO COMPLETA!');
      console.log(`✅ Todas as ${checkpoint.total} assets foram processadas!`);
      console.log(`✅ ${checkpoint.updated} assets atualizadas com IPFS URLs`);
      
      if (checkpoint.errors > 0) {
        console.log(`⚠️  ${checkpoint.errors} erros encontrados`);
      }
      
      // Parar tudo
      if (extractionProcess) {
        extractionProcess.kill();
      }
      
      if (completionCheckInterval) {
        clearInterval(completionCheckInterval);
      }
      
      console.log('\n🏁 Daemon finalizado com sucesso!');
      process.exit(0);
    }
  }
}

// Lidar com sinais
process.on('SIGINT', () => {
  console.log('\n\n⏸️  Parando daemon...');
  
  if (extractionProcess) {
    extractionProcess.kill();
  }
  
  if (completionCheckInterval) {
    clearInterval(completionCheckInterval);
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Daemon terminado.');
  
  if (extractionProcess) {
    extractionProcess.kill();
  }
  
  if (completionCheckInterval) {
    clearInterval(completionCheckInterval);
  }
  
  process.exit(0);
});

// Função principal
async function main() {
  await ensureLogDir();
  
  console.log('🤖 IPFS Complete Daemon v1.0');
  console.log('Este daemon executará a extração IPFS até 100% de conclusão');
  console.log('Pressione Ctrl+C para parar\n');
  
  // Verificar estado inicial
  const initialCheckpoint = await readCheckpoint();
  if (initialCheckpoint) {
    showProgress(initialCheckpoint);
    
    if (initialCheckpoint.processed >= initialCheckpoint.total) {
      console.log('\n✅ Extração já está completa!');
      process.exit(0);
    }
  }
  
  // Iniciar monitoramento
  completionCheckInterval = setInterval(checkCompletion, COMPLETION_CHECK_INTERVAL);
  setInterval(checkProgress, MONITOR_INTERVAL);
  
  // Iniciar extração
  await startExtraction();
  
  console.log('\n🔄 Daemon iniciado. Monitorando progresso...');
}

// Executar
main().catch(console.error);