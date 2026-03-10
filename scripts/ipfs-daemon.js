#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configurações
const CHECKPOINT_FILE = './ipfs-extraction-checkpoint.json';
const PID_FILE = './ipfs-extraction.pid';
const LOG_DIR = './logs';
const LOG_FILE = `${LOG_DIR}/ipfs-extraction-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.log`;

// Criar diretório de logs se não existir
async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (e) {}
}

// Função para escrever PID
async function writePid() {
  await fs.writeFile(PID_FILE, process.pid.toString());
}

// Função para remover PID
async function removePid() {
  try {
    await fs.unlink(PID_FILE);
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

// Função principal do daemon
async function runDaemon() {
  await ensureLogDir();
  await writePid();
  
  console.log('🚀 IPFS Extraction Daemon iniciado');
  console.log(`📝 PID: ${process.pid}`);
  console.log(`📊 Checkpoint: ${CHECKPOINT_FILE}`);
  console.log(`📄 Log: ${LOG_FILE}`);
  console.log('');
  console.log('Comandos:');
  console.log(`  Verificar status: node scripts/ipfs-status.js`);
  console.log(`  Parar daemon: kill ${process.pid}`);
  console.log(`  Ver logs: tail -f ${LOG_FILE}`);
  console.log('');
  
  // Criar arquivo de log
  const logStream = await fs.open(LOG_FILE, 'a');
  await logStream.write(`[${new Date().toISOString()}] Daemon iniciado PID: ${process.pid}\n`);
  
  let extractProcess = null;
  let restartCount = 0;
  const MAX_RESTARTS = 5;
  
  // Função para iniciar extração
  async function startExtraction() {
    if (extractProcess) {
      extractProcess.kill();
    }
    
    const checkpoint = await readCheckpoint();
    if (checkpoint && checkpoint.processed >= checkpoint.total) {
      await logStream.write(`[${new Date().toISOString()}] Extração já completa! ${checkpoint.processed}/${checkpoint.total}\n`);
      console.log('✅ Extração já foi concluída!');
      await cleanup();
      return;
    }
    
    console.log(`🔄 Iniciando processo de extração (tentativa ${restartCount + 1}/${MAX_RESTARTS})`);
    await logStream.write(`[${new Date().toISOString()}] Iniciando extração (tentativa ${restartCount + 1})\n`);
    
    extractProcess = spawn('node', ['scripts/extract-ipfs-images-batch.js'], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    // Capturar saída
    extractProcess.stdout.on('data', async (data) => {
      await logStream.write(data);
    });
    
    extractProcess.stderr.on('data', async (data) => {
      await logStream.write(`[ERROR] ${data}`);
    });
    
    // Lidar com encerramento
    extractProcess.on('close', async (code) => {
      await logStream.write(`[${new Date().toISOString()}] Processo encerrado com código ${code}\n`);
      
      const checkpoint = await readCheckpoint();
      if (checkpoint && checkpoint.processed >= checkpoint.total) {
        console.log('✅ Extração concluída com sucesso!');
        await logStream.write(`[${new Date().toISOString()}] EXTRAÇÃO COMPLETA! ${checkpoint.processed}/${checkpoint.total}\n`);
        await cleanup();
      } else if (code !== 0 && restartCount < MAX_RESTARTS) {
        restartCount++;
        console.log(`⚠️  Processo falhou. Reiniciando em 30 segundos...`);
        await logStream.write(`[${new Date().toISOString()}] Reiniciando em 30 segundos...\n`);
        setTimeout(startExtraction, 30000);
      } else {
        console.log('❌ Processo falhou múltiplas vezes. Encerrando daemon.');
        await cleanup();
      }
    });
  }
  
  // Função de limpeza
  async function cleanup() {
    if (extractProcess) {
      extractProcess.kill();
    }
    await removePid();
    await logStream.close();
    process.exit(0);
  }
  
  // Lidar com sinais
  process.on('SIGINT', async () => {
    console.log('\n⏸️  Daemon interrompido');
    await logStream.write(`[${new Date().toISOString()}] Daemon interrompido por SIGINT\n`);
    await cleanup();
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n⏹️  Daemon terminado');
    await logStream.write(`[${new Date().toISOString()}] Daemon terminado por SIGTERM\n`);
    await cleanup();
  });
  
  // Iniciar extração
  await startExtraction();
  
  // Monitorar progresso a cada minuto
  setInterval(async () => {
    const checkpoint = await readCheckpoint();
    if (checkpoint) {
      const percent = ((checkpoint.processed / checkpoint.total) * 100).toFixed(2);
      await logStream.write(
        `[${new Date().toISOString()}] Progresso: ${checkpoint.processed}/${checkpoint.total} (${percent}%)\n`
      );
    }
  }, 60000);
}

// Script de status
async function showStatus() {
  try {
    // Verificar se daemon está rodando
    const pidData = await fs.readFile(PID_FILE, 'utf8');
    const pid = parseInt(pidData);
    
    try {
      process.kill(pid, 0); // Verifica se processo existe
      console.log(`✅ Daemon rodando (PID: ${pid})`);
    } catch (e) {
      console.log('❌ Daemon não está rodando');
      await removePid();
    }
  } catch (e) {
    console.log('❌ Daemon não está rodando');
  }
  
  // Mostrar checkpoint
  const checkpoint = await readCheckpoint();
  if (checkpoint) {
    const percent = ((checkpoint.processed / checkpoint.total) * 100).toFixed(2);
    const elapsed = (new Date() - new Date(checkpoint.startTime)) / 1000 / 60;
    const rate = checkpoint.processed / (elapsed * 60);
    const remaining = (checkpoint.total - checkpoint.processed) / rate / 60;
    
    console.log('\n📊 Status da Extração:');
    console.log(`Total: ${checkpoint.total}`);
    console.log(`Processados: ${checkpoint.processed} (${percent}%)`);
    console.log(`Atualizados: ${checkpoint.updated}`);
    console.log(`Erros: ${checkpoint.errors}`);
    console.log(`Taxa: ${rate.toFixed(1)} assets/seg`);
    console.log(`Tempo restante: ${remaining.toFixed(1)} minutos`);
    
    // Barra de progresso
    const barLength = 40;
    const filled = Math.round((checkpoint.processed / checkpoint.total) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`\n[${bar}] ${percent}%`);
  }
  
  // Mostrar últimas linhas do log
  try {
    const logs = await fs.readdir(LOG_DIR);
    const latestLog = logs.sort().pop();
    if (latestLog) {
      console.log(`\n📄 Log: ${LOG_DIR}/${latestLog}`);
    }
  } catch (e) {}
}

// Determinar modo de execução
if (process.argv[2] === 'status') {
  showStatus().catch(console.error);
} else if (process.argv[2] === 'stop') {
  fs.readFile(PID_FILE, 'utf8')
    .then(pid => {
      process.kill(parseInt(pid), 'SIGTERM');
      console.log('✅ Sinal de parada enviado');
    })
    .catch(() => console.log('❌ Daemon não está rodando'));
} else {
  // Verificar se já está rodando
  fs.readFile(PID_FILE, 'utf8')
    .then(pid => {
      try {
        process.kill(parseInt(pid), 0);
        console.log(`⚠️  Daemon já está rodando (PID: ${pid})`);
        console.log('Use "node scripts/ipfs-daemon.js status" para ver o status');
        process.exit(1);
      } catch (e) {
        // PID existe mas processo não, limpar
        removePid().then(() => runDaemon());
      }
    })
    .catch(() => {
      // Não está rodando, iniciar
      runDaemon().catch(console.error);
    });
}