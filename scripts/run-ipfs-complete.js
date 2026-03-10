const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configurações
const CHECKPOINT_FILE = './ipfs-extraction-checkpoint.json';
const LOG_FILE = `./ipfs-extraction-${new Date().toISOString().slice(0,10)}.log`;
const CHECK_INTERVAL = 30000; // Verificar a cada 30 segundos

// Função para ler checkpoint
async function readCheckpoint() {
  try {
    const data = await fs.readFile(CHECKPOINT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

// Função para mostrar progresso
function showProgress(checkpoint) {
  if (!checkpoint) return;
  
  const percent = ((checkpoint.processed / checkpoint.total) * 100).toFixed(2);
  const elapsed = (new Date() - new Date(checkpoint.startTime)) / 1000 / 60; // minutos
  const rate = checkpoint.processed / (elapsed * 60); // por segundo
  const remaining = (checkpoint.total - checkpoint.processed) / rate / 60; // minutos
  
  console.log('\n📊 Progresso da Extração IPFS');
  console.log('═'.repeat(50));
  console.log(`Total: ${checkpoint.total} assets`);
  console.log(`✅ Processados: ${checkpoint.processed} (${percent}%)`);
  console.log(`📦 Atualizados: ${checkpoint.updated}`);
  console.log(`⏩ Pulados: ${checkpoint.skipped}`);
  console.log(`❌ Erros: ${checkpoint.errors}`);
  console.log(`⏱️  Tempo decorrido: ${elapsed.toFixed(1)} minutos`);
  console.log(`🚀 Taxa: ${rate.toFixed(1)} assets/segundo`);
  console.log(`⏳ Tempo restante: ${remaining.toFixed(1)} minutos`);
  console.log(`🔄 Último ID: ${checkpoint.lastProcessedId}`);
  
  // Barra de progresso
  const barLength = 40;
  const filled = Math.round((checkpoint.processed / checkpoint.total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  console.log(`\nProgresso: [${bar}] ${percent}%`);
}

// Função principal
async function runExtraction() {
  console.log('🚀 Iniciando extração completa de IPFS images...');
  console.log(`📝 Log file: ${LOG_FILE}`);
  console.log(`📊 Checkpoint: ${CHECKPOINT_FILE}`);
  console.log('');
  
  // Criar arquivo de log
  const logStream = await fs.open(LOG_FILE, 'a');
  
  // Iniciar processo
  const extractProcess = spawn('node', ['scripts/extract-ipfs-images-batch.js'], {
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  // Capturar saída para o log
  extractProcess.stdout.on('data', async (data) => {
    await logStream.write(data);
    // Mostrar apenas linhas importantes no console
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.includes('✅') || line.includes('❌') || line.includes('Processing batch')) {
        console.log(line);
      }
    }
  });
  
  extractProcess.stderr.on('data', async (data) => {
    await logStream.write(data);
    console.error('Erro:', data.toString());
  });
  
  // Monitorar progresso
  const progressInterval = setInterval(async () => {
    const checkpoint = await readCheckpoint();
    if (checkpoint) {
      console.clear();
      showProgress(checkpoint);
      
      // Verificar se completou
      if (checkpoint.processed >= checkpoint.total) {
        console.log('\n✅ EXTRAÇÃO COMPLETA!');
        clearInterval(progressInterval);
        extractProcess.kill();
      }
    }
  }, CHECK_INTERVAL);
  
  // Lidar com encerramento do processo
  extractProcess.on('close', async (code) => {
    clearInterval(progressInterval);
    await logStream.close();
    
    const finalCheckpoint = await readCheckpoint();
    console.log('\n' + '='.repeat(50));
    
    if (code === 0 || (finalCheckpoint && finalCheckpoint.processed >= finalCheckpoint.total)) {
      console.log('✅ PROCESSO CONCLUÍDO COM SUCESSO!');
    } else {
      console.log(`⚠️  Processo encerrado com código ${code}`);
    }
    
    if (finalCheckpoint) {
      showProgress(finalCheckpoint);
      console.log('\n📊 Estatísticas Finais:');
      console.log(`- Sucesso: ${finalCheckpoint.updated} assets`);
      console.log(`- Pulados: ${finalCheckpoint.skipped} assets`);
      console.log(`- Erros: ${finalCheckpoint.errors} assets`);
      
      if (finalCheckpoint.processed < finalCheckpoint.total) {
        console.log(`\n⚠️  Ainda faltam ${finalCheckpoint.total - finalCheckpoint.processed} assets`);
        console.log('Execute novamente para continuar de onde parou.');
      }
    }
  });
  
  // Lidar com CTRL+C
  process.on('SIGINT', () => {
    console.log('\n\n⏸️  Interrompido pelo usuário. Salvando checkpoint...');
    extractProcess.kill();
    process.exit(0);
  });
  
  // Mostrar progresso inicial
  const initialCheckpoint = await readCheckpoint();
  if (initialCheckpoint) {
    showProgress(initialCheckpoint);
  }
}

// Executar
runExtraction().catch(console.error);