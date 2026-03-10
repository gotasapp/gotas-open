import { z } from 'zod';

// Schema para IDs
export const idSchema = z.string()
  .min(1, 'ID é obrigatório')
  .regex(/^[a-zA-Z0-9_-]+$/, 'ID contém caracteres inválidos');

// Função para validar endereço Ethereum
const isValidEthereumAddress = (address: string): boolean => {
  // Verificar se é uma string
  if (typeof address !== 'string') return false;
  
  // Verificar se tem o formato correto (0x seguido de 40 caracteres hexadecimais)
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
};

// Schema para endereço de carteira
export const walletAddressSchema = z.string()
  .min(1, 'Endereço da carteira é obrigatório')
  .refine(isValidEthereumAddress, {
    message: 'Endereço da carteira deve ser um endereço Ethereum válido (formato: 0x...)',
  });

// Schema para valor monetário
export const amountSchema = z.string()
  .min(1, 'Valor é obrigatório')
  .refine((value) => {
    const num = parseFloat(value.replace(',', '.'));
    return !isNaN(num) && num > 0;
  }, 'Valor deve ser maior que zero');

// Schema para CPF
export const cpfSchema = z.string()
  .min(1, 'CPF é obrigatório')
  .refine((cpf) => {
    // Remove caracteres não numéricos
    const numbers = cpf.replace(/\D/g, '');
    return numbers.length === 11;
  }, 'CPF deve ter 11 dígitos');

// Schema para data de nascimento
export const birthDateSchema = z.string()
  .min(1, 'Data de nascimento é obrigatória')
  .refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 18;
  }, 'Você deve ter pelo menos 18 anos');

// Schema para nome completo
export const fullNameSchema = z.string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome não pode ter mais de 100 caracteres')
  .refine((name) => {
    // Verificar se tem pelo menos nome e sobrenome
    const parts = name.trim().split(' ').filter(part => part.length > 0);
    return parts.length >= 2;
  }, 'Digite seu nome completo (nome e sobrenome)');

// Schema para token
export const tokenSchema = z.string()
  .min(1, 'Token é obrigatório')
  .max(10, 'Token inválido');

// Schema para tax ID (CPF)
export const taxIdSchema = z.string()
  .min(1, 'CPF é obrigatório')
  .refine((cpf) => {
    const numbers = cpf.replace(/\D/g, '');
    return numbers.length === 11;
  }, 'CPF deve ter 11 dígitos');

// Schema para email
export const emailSchema = z.string()
  .email('Email inválido');

// Schema para senha
export const passwordSchema = z.string()
  .min(6, 'Senha deve ter no mínimo 6 caracteres');

// Schema para login admin
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

// Schema para KYC
export const kycSchema = z.object({
  fullName: fullNameSchema,
  cpf: cpfSchema,
  birthDate: birthDateSchema,
});

// Schema para PIX
export const pixSchema = z.object({
  taxId: taxIdSchema,
  amount: z.number().positive('Valor deve ser maior que zero'),
  token: tokenSchema.default('CHZ'),
  receiverAddress: walletAddressSchema,
  markup: z.string().optional(),
  markupAddress: walletAddressSchema.optional(),
  externalId: z.string().optional(),
  quoteToken: z.string().optional()
});

// Schema para cotação rápida
export const fastQuoteSchema = z.object({
  token: tokenSchema,
  amount: amountSchema,
  receiverAddress: walletAddressSchema.optional()
});

// Schema para status de pagamento
export const paymentStatusSchema = z.object({
  orderId: z.string().min(1, 'ID do pedido é obrigatório')
});

// Schema para NFT
export const nftSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().max(500).optional(),
  image: z.string().url('URL de imagem inválida'),
  category_id: idSchema.optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
  price: z.number().min(0).optional(),
  supply: z.number().int().min(1).optional()
});

// Schema para categoria
export const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(50),
  description: z.string().max(200).optional(),
  is_active: z.boolean().default(true)
});

// Schema para staking token
export const stakingTokenSchema = z.object({
  symbol: tokenSchema,
  name: z.string().min(1).max(100),
  contract_address: walletAddressSchema,
  decimals: z.number().int().min(0).max(18).default(18),
  is_active: z.boolean().default(true),
  is_fan_token: z.boolean().default(false),
  is_available_for_purchase: z.boolean().default(false)
});

// Schema para mint de asset
export const mintAssetSchema = z.object({
  assetId: idSchema,
  walletAddress: walletAddressSchema,
  quantity: z.number().int().min(1).default(1)
});

// Schema para upload de imagem de perfil
export const profileImageSchema = z.object({
  imageUrl: z.string().url('URL de imagem inválida')
});

// Função helper para validar e retornar erro formatado
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | 
  { success: false; error: string; details?: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { 
        success: false, 
        error: firstError.message,
        details: error 
      };
    }
    return { success: false, error: 'Erro de validação desconhecido' };
  }
} 