// Seedtag tracking functions

// Função para criar e disparar pixel Seedtag
function fireSeedtagPixel(cat: string) {
  try {
    const floodlightId = process.env.NEXT_PUBLIC_SEEDTAG_FLOODLIGHT_ID;
    const activityGroup = process.env.NEXT_PUBLIC_SEEDTAG_ACTIVITY_GROUP_STRING;
    
    if (!floodlightId || !activityGroup) {
      console.warn('Seedtag configuration missing');
      return;
    }
    
    // Gera um ord único para cache busting
    const ord = Math.random() * 10000000000000;
    
    // Constrói a URL do pixel
    const pixelUrl = `https://${floodlightId}.fls.doubleclick.net/activityi;src=${floodlightId};type=${activityGroup};cat=${cat};ord=${ord}?`;
    
    // Cria e adiciona o pixel à página
    const img = new Image(1, 1);
    img.src = pixelUrl;
    img.style.display = 'none';
    
    // Adiciona ao DOM temporariamente
    document.body.appendChild(img);
    
    // Remove após carregamento
    img.onload = () => {
      setTimeout(() => {
        if (img.parentNode) {
          img.parentNode.removeChild(img);
        }
      }, 100);
    };
    
    console.log('Seedtag pixel fired:', { cat, ord });
  } catch (error) {
    console.error('Error firing Seedtag pixel:', error);
  }
}

// Função para rastrear visita à página
export function trackSeedtagVisit() {
  try {
    const visitString = process.env.NEXT_PUBLIC_SEEDTAG_VISIT_STRING || 'br_ch0';
    fireSeedtagPixel(visitString);
    
    console.log('Seedtag visit tracked');
  } catch (error) {
    console.error('Error tracking Seedtag visit:', error);
  }
}

// Função para rastrear clique no botão de compra
export function trackSeedtagPurchaseClick() {
  try {
    const purchaseString = process.env.NEXT_PUBLIC_SEEDTAG_PURCHASE_STRING || 'br_ch00';
    fireSeedtagPixel(purchaseString);
    
    console.log('Seedtag purchase click tracked');
  } catch (error) {
    console.error('Error tracking Seedtag purchase click:', error);
  }
}

// Função de debug para verificar configuração Seedtag
export function debugSeedtagConfig() {
  console.log('Seedtag configuration:', {
    floodlightId: process.env.NEXT_PUBLIC_SEEDTAG_FLOODLIGHT_ID,
    activityGroup: process.env.NEXT_PUBLIC_SEEDTAG_ACTIVITY_GROUP_STRING,
    visitString: process.env.NEXT_PUBLIC_SEEDTAG_VISIT_STRING,
    purchaseString: process.env.NEXT_PUBLIC_SEEDTAG_PURCHASE_STRING
  });
}