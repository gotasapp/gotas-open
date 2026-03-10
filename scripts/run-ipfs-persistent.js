#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configurações
const CHECKPOINT_FILE = './ipfs-extraction-checkpoint.json';
const LOG_DIR = './logs';
const MAX_RETRIES = 100; // Aumentado para garantir conclusão
const RETRY_DELAY = 10000; // 10 segundos entre tentativas

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

// Função principal
async function runPersistent() {
  await ensureLogDir();
  
  console.log('🚀 Iniciando extração IPFS persistente');
  console.log('Este processo executará até completar 100% ou atingir o limite de tentativas.');
  console.log('');
  
  let retryCount = 0;
  let lastProcessedCount = 0;
  let stuckCount = 0;
  
  while (retryCount < MAX_RETRIES) {
    const checkpoint = await readCheckpoint();
    
    // Verificar se já completou
    if (checkpoint && checkpoint.processed >= checkpoint.total) {
      console.log('\n✅ EXTRAÇÃO COMPLETA!');
      console.log(`Total processado: ${checkpoint.processed}/${checkpoint.total}`);
      console.log(`Atualizados: ${checkpoint.updated}`);
      console.log(`Erros: ${checkpoint.errors}`);
      process.exit(0);
    }
    
    // Mostrar progresso
    if (checkpoint) {
      const percent = ((checkpoint.processed / checkpoint.total) * 100).toFixed(2);
      console.log(`\n📊 Tentativa ${retryCount + 1}/${MAX_RETRIES}`);
      console.log(`Progresso: ${checkpoint.processed}/${checkpoint.total} (${percent}%)`);
      
      // Verificar se está travado
      if (checkpoint.processed === lastProcessedCount) {
        stuckCount++;
        if (stuckCount > 3) {
          console.log('⚠️  Processo parece travado. Reiniciando...');
          stuckCount = 0;
        }
      } else {
        stuckCount = 0;
        lastProcessedCount = checkpoint.processed;
      }
    }
    
    console.log('🔄 Iniciando processo de extração...');
    
    // Criar novo processo
    const extractProcess = spawn('node', ['scripts/extract-ipfs-images-batch.js'], {
      stdio: 'inherit'
    });
    
    // Aguardar processo terminar
    await new Promise((resolve) => {
      extractProcess.on('close', (code) => {
        console.log(`\nProcesso encerrado com código: ${code}`);
        resolve();
      });
      
      // Timeout de segurança (30 minutos)
      setTimeout(() => {
        console.log('\n⏱️  Timeout atingido. Reiniciando...');
        extractProcess.kill();
        resolve();
      }, 30 * 60 * 1000);
    });
    
    retryCount++;
    
    // Aguardar antes de tentar novamente
    if (retryCount < MAX_RETRIES) {
      console.log(`\n⏳ Aguardando ${RETRY_DELAY/1000} segundos antes de continuar...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  console.log('\n❌ Limite de tentativas atingido.');
  const finalCheckpoint = await readCheckpoint();
  if (finalCheckpoint) {
    console.log(`Processados: ${finalCheckpoint.processed}/${finalCheckpoint.total}`);
    console.log('Execute novamente para continuar.');
  }
}

// Lidar com CTRL+C
process.on('SIGINT', () => {
  console.log('\n\n⏸️  Interrompido pelo usuário.');
  process.exit(0);
});

// Executar
runPersistent().catch(console.error);