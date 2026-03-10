-- Schema para NFT Gallery
-- Cria o banco de dados se não existir
-- CREATE DATABASE nft_gallery;

-- Conecta ao banco de dados
-- \c nft_gallery;

-- Enum para categorias de NFTs
CREATE TYPE nft_category AS ENUM (
  'art',
  'collectible',
  'ticket',
  'utility',
  'identity',
  'membership'
);

-- Enum para raridade de NFTs
CREATE TYPE nft_rarity AS ENUM (
  'common',
  'epic',
  'legendary'
);

-- Tabela para armazenar NFTs
CREATE TABLE nfts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category nft_category NOT NULL,
  rarity nft_rarity NOT NULL,
  total_supply INTEGER NOT NULL,
  claimed_supply INTEGER NOT NULL DEFAULT 0,
  max_per_user INTEGER NOT NULL DEFAULT 1,
  release_date TIMESTAMP NOT NULL DEFAULT NOW(),
  expiration_date TIMESTAMP,
  cooldown_minutes INTEGER, -- Período de resfriamento em minutos (NULL se não for permitido reivindicar novamente)
  image_url TEXT NOT NULL, -- URL da imagem (no futuro, integrar com S3)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para melhorar a performance das consultas
CREATE INDEX nfts_category_idx ON nfts (category);
CREATE INDEX nfts_rarity_idx ON nfts (rarity);
CREATE INDEX nfts_release_date_idx ON nfts (release_date);

-- Tabela para controlar os NFTs reivindicados pelos usuários
CREATE TABLE user_nfts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL, -- ID do usuário (poderia ser um UUID ou outro identificador)
  nft_id INTEGER NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_claimed_at TIMESTAMP NOT NULL DEFAULT NOW(), -- Para NFTs que podem ser reivindicados periodicamente
  claim_count INTEGER NOT NULL DEFAULT 1, -- Quantas vezes o usuário reivindicou este NFT
  UNIQUE (user_id, nft_id) -- Um usuário só pode ter uma entrada para cada NFT
);

-- Índices para melhorar a performance das consultas em user_nfts
CREATE INDEX user_nfts_user_id_idx ON user_nfts (user_id);
CREATE INDEX user_nfts_nft_id_idx ON user_nfts (nft_id);
CREATE INDEX user_nfts_claimed_at_idx ON user_nfts (claimed_at);

-- Dados de exemplo para NFTs
INSERT INTO nfts (
  title,
  description,
  category,
  rarity,
  total_supply,
  claimed_supply,
  max_per_user,
  release_date,
  expiration_date,
  cooldown_minutes,
  image_url
) VALUES
(
  'Pixels.01',
  'Limited Edition NFT Collection - Part of the first Pixels series',
  'art',
  'rare',
  100,
  42,
  1,
  NOW() - INTERVAL '30 days',
  NOW() + INTERVAL '60 days',
  NULL,
  'https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
),
(
  'Pixels.02',
  'Abstract Generative Art - Digital collectible with unique algorithm',
  'art',
  'epic',
  50,
  12,
  1,
  NOW() - INTERVAL '15 days',
  NOW() + INTERVAL '90 days',
  NULL,
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
),
(
  'Pixels.03',
  'Digital Art Collection - The latest in the Pixels series',
  'collectible',
  'legendary',
  25,
  3,
  1,
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '120 days',
  NULL,
  'https://images.unsplash.com/photo-1607457561901-e6ec3a6d16cf?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
),
(
  'Daily Pixels',
  'A daily collectible pixel art that can be claimed once every 24 hours',
  'collectible',
  'common',
  99999, -- Quase ilimitado
  150,
  30, -- Um usuário pode ter até 30 (um mês de coleção)
  NOW() - INTERVAL '10 days',
  NOW() + INTERVAL '365 days', -- Disponível por um ano
  24 * 60, -- Pode ser reivindicado a cada 1440 minutos (24 horas)
  'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?q=80&w=3096&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
),
(
  'Weekly Exclusive',
  'Weekly exclusive artwork that can be claimed once per week',
  'art',
  'uncommon',
  5000,
  320,
  4, -- Um usuário pode ter até 4 (um mês de coleção)
  NOW() - INTERVAL '21 days',
  NOW() + INTERVAL '180 days', -- Disponível por seis meses
  168 * 60, -- Pode ser reivindicado a cada 10080 minutos (1 semana)
  'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
);

-- Função para verificar se um usuário pode reivindicar um NFT
CREATE OR REPLACE FUNCTION can_claim_nft(
  p_user_id VARCHAR(255),
  p_nft_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_nft RECORD;
  v_user_claim RECORD;
  v_claim_count INTEGER;
BEGIN
  -- Obter informações do NFT
  SELECT * INTO v_nft FROM nfts WHERE id = p_nft_id;

  -- Verificar se o NFT existe
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Verificar se o NFT ainda tem suprimento disponível
  IF v_nft.claimed_supply >= v_nft.total_supply THEN
    RETURN FALSE;
  END IF;

  -- Verificar se o NFT está dentro do período de disponibilidade
  IF v_nft.release_date > NOW() OR (v_nft.expiration_date IS NOT NULL AND v_nft.expiration_date < NOW()) THEN
    RETURN FALSE;
  END IF;

  -- Verificar quantos deste NFT o usuário já reivindicou
  SELECT COUNT(*) INTO v_claim_count FROM user_nfts WHERE user_id = p_user_id AND nft_id = p_nft_id;

  -- Se o usuário nunca reivindicou este NFT
  IF v_claim_count = 0 THEN
    RETURN TRUE;
  END IF;

  -- Se o NFT não pode ser reivindicado novamente (cooldown_minutes é NULL)
  IF v_nft.cooldown_minutes IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verificar se o usuário já atingiu o limite por usuário
  IF v_claim_count >= v_nft.max_per_user THEN
    RETURN FALSE;
  END IF;

  -- Verificar quando foi a última vez que o usuário reivindicou este NFT
  SELECT * INTO v_user_claim
  FROM user_nfts
  WHERE user_id = p_user_id AND nft_id = p_nft_id
  ORDER BY last_claimed_at DESC
  LIMIT 1;

  -- Verificar se o período de cooldown já passou
  IF v_user_claim.last_claimed_at + (v_nft.cooldown_minutes * INTERVAL '1 minute') > NOW() THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para reivindicar um NFT
CREATE OR REPLACE FUNCTION claim_nft(
  p_user_id VARCHAR(255),
  p_nft_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_can_claim BOOLEAN;
  v_user_claim RECORD;
BEGIN
  -- Verificar se o usuário pode reivindicar o NFT
  SELECT can_claim_nft(p_user_id, p_nft_id) INTO v_can_claim;

  IF NOT v_can_claim THEN
    RETURN FALSE;
  END IF;

  -- Verificar se o usuário já reivindicou este NFT antes
  SELECT * INTO v_user_claim
  FROM user_nfts
  WHERE user_id = p_user_id AND nft_id = p_nft_id;

  -- Iniciar transação
  BEGIN
    -- Atualizar o suprimento reivindicado
    UPDATE nfts
    SET claimed_supply = claimed_supply + 1,
        updated_at = NOW()
    WHERE id = p_nft_id;

    -- Se o usuário já reivindicou este NFT antes, atualizar o registro
    IF FOUND THEN
      UPDATE user_nfts
      SET last_claimed_at = NOW(),
          claim_count = claim_count + 1
      WHERE user_id = p_user_id AND nft_id = p_nft_id;
    ELSE
      -- Senão, criar um novo registro
      INSERT INTO user_nfts (user_id, nft_id)
      VALUES (p_user_id, p_nft_id);
    END IF;

    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN FALSE;
  END;
END;
$$ LANGUAGE plpgsql;

-- View para listar NFTs disponíveis com informações de progresso
CREATE OR REPLACE VIEW available_nfts AS
SELECT
  n.id,
  n.title,
  n.description,
  n.category,
  n.rarity,
  n.total_supply,
  n.claimed_supply,
  n.max_per_user,
  n.release_date,
  n.expiration_date,
  n.cooldown_minutes,
  n.image_url,
  ROUND((n.claimed_supply::float / n.total_supply::float) * 100) AS claim_percentage,
  n.total_supply - n.claimed_supply AS remaining_supply,
  CASE
    WHEN n.expiration_date IS NOT NULL THEN
      EXTRACT(EPOCH FROM (n.expiration_date - NOW())) / 86400
    ELSE NULL
  END AS days_remaining,
  CASE
    WHEN n.cooldown_minutes IS NOT NULL THEN
      'Reclaimable every ' || n.cooldown_minutes || ' minutes'
    ELSE
      'One-time claim'
  END AS claim_frequency
FROM nfts n
WHERE
  n.release_date <= NOW() AND
  (n.expiration_date IS NULL OR n.expiration_date > NOW()) AND
  n.claimed_supply < n.total_supply
ORDER BY
  n.rarity DESC,
  claim_percentage ASC;

-- Personal Finance Management Schema
-- Enum types for personal finance
CREATE TYPE account_type AS ENUM (
  'checking',
  'savings',
  'credit_card',
  'investment',
  'cash'
);

CREATE TYPE transaction_type AS ENUM (
  'income',
  'expense',
  'transfer'
);

CREATE TYPE category_type AS ENUM (
  'income',
  'expense'
);

CREATE TYPE budget_period AS ENUM (
  'weekly',
  'monthly',
  'yearly'
);

CREATE TYPE recurring_frequency AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

CREATE TYPE goal_priority AS ENUM (
  'low',
  'medium',
  'high'
);

CREATE TYPE goal_category AS ENUM (
  'emergency_fund',
  'vacation',
  'house',
  'car',
  'education',
  'retirement',
  'other'
);

-- Accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type account_type NOT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type category_type NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  icon VARCHAR(50) NOT NULL DEFAULT 'tag',
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount DECIMAL(12,2) NOT NULL,
  description VARCHAR(500) NOT NULL,
  notes TEXT,
  type transaction_type NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_type recurring_frequency,
  recurring_end_date DATE,
  tags TEXT[] DEFAULT '{}',
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Budgets table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  period budget_period NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  spent DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  alert_threshold INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Financial Goals table
CREATE TABLE financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  target_date DATE NOT NULL,
  priority goal_priority NOT NULL DEFAULT 'medium',
  category goal_category NOT NULL DEFAULT 'other',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Transfers table
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  description VARCHAR(500) NOT NULL,
  date DATE NOT NULL,
  fee DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Recurring Transactions table
CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  description VARCHAR(500) NOT NULL,
  type transaction_type NOT NULL,
  frequency recurring_frequency NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Budget Alerts table
CREATE TABLE budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('warning', 'exceeded', 'approaching')),
  percentage INTEGER NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_accounts_type ON accounts (type);
CREATE INDEX idx_accounts_active ON accounts (is_active);
CREATE INDEX idx_categories_type ON categories (type);
CREATE INDEX idx_categories_active ON categories (is_active);
CREATE INDEX idx_transactions_account_id ON transactions (account_id);
CREATE INDEX idx_transactions_category_id ON transactions (category_id);
CREATE INDEX idx_transactions_date ON transactions (date);
CREATE INDEX idx_transactions_type ON transactions (type);
CREATE INDEX idx_budgets_category_id ON budgets (category_id);
CREATE INDEX idx_budgets_period ON budgets (period);
CREATE INDEX idx_budgets_active ON budgets (is_active);
CREATE INDEX idx_goals_category ON financial_goals (category);
CREATE INDEX idx_goals_completed ON financial_goals (is_completed);
CREATE INDEX idx_transfers_from_account ON transfers (from_account_id);
CREATE INDEX idx_transfers_to_account ON transfers (to_account_id);
CREATE INDEX idx_transfers_date ON transfers (date);
CREATE INDEX idx_recurring_active ON recurring_transactions (is_active);
CREATE INDEX idx_recurring_next_date ON recurring_transactions (next_date);

-- Default categories
INSERT INTO categories (name, type, color, icon) VALUES
-- Income categories
('Salário', 'income', '#10B981', 'briefcase'),
('Freelance', 'income', '#059669', 'laptop'),
('Investimentos', 'income', '#047857', 'trending-up'),
('Vendas', 'income', '#065F46', 'shopping-bag'),
('Outros', 'income', '#064E3B', 'plus-circle'),

-- Expense categories
('Alimentação', 'expense', '#EF4444', 'utensils'),
('Transporte', 'expense', '#F97316', 'car'),
('Moradia', 'expense', '#8B5CF6', 'home'),
('Saúde', 'expense', '#EC4899', 'heart'),
('Educação', 'expense', '#3B82F6', 'book'),
('Entretenimento', 'expense', '#06B6D4', 'film'),
('Compras', 'expense', '#84CC16', 'shopping-cart'),
('Serviços', 'expense', '#6366F1', 'tool'),
('Impostos', 'expense', '#DC2626', 'file-text'),
('Outros', 'expense', '#6B7280', 'more-horizontal');

-- Default account
INSERT INTO accounts (name, type, balance, currency, color) VALUES
('Conta Corrente', 'checking', 0.00, 'BRL', '#3B82F6');

-- Function to update account balance after transaction
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;

  -- For UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Revert old transaction
    IF OLD.type = 'income' THEN
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    END IF;

    -- Apply new transaction
    IF NEW.type = 'income' THEN
      UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;

  -- For DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.type = 'income' THEN
      UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update account balance
CREATE TRIGGER transaction_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Function to update budget spent amount
CREATE OR REPLACE FUNCTION update_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- Update budget spent amount for expense transactions
  IF NEW.type = 'expense' THEN
    UPDATE budgets
    SET spent = (
      SELECT COALESCE(SUM(amount), 0)
      FROM transactions
      WHERE category_id = NEW.category_id
        AND type = 'expense'
        AND date >= budgets.start_date
        AND date <= budgets.end_date
    )
    WHERE category_id = NEW.category_id
      AND is_active = true
      AND NEW.date >= start_date
      AND NEW.date <= end_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update budget spent amount
CREATE TRIGGER budget_spent_trigger
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_budget_spent();

-- View for monthly financial summary
CREATE OR REPLACE VIEW monthly_summary AS
SELECT
  EXTRACT(YEAR FROM date) as year,
  EXTRACT(MONTH FROM date) as month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_income
FROM transactions
GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
ORDER BY year DESC, month DESC;

-- View for category spending summary
CREATE OR REPLACE VIEW category_summary AS
SELECT
  c.id,
  c.name,
  c.type,
  c.color,
  c.icon,
  COALESCE(SUM(t.amount), 0) as total_amount,
  COUNT(t.id) as transaction_count
FROM categories c
LEFT JOIN transactions t ON c.id = t.category_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.type, c.color, c.icon
ORDER BY total_amount DESC;

-- View for budget performance
CREATE OR REPLACE VIEW budget_performance AS
SELECT
  b.id,
  b.name,
  b.amount as budgeted,
  b.spent,
  b.amount - b.spent as remaining,
  CASE
    WHEN b.amount > 0 THEN ROUND((b.spent / b.amount) * 100, 2)
    ELSE 0
  END as percentage_used,
  b.alert_threshold,
  c.name as category_name,
  c.color as category_color,
  b.start_date,
  b.end_date,
  b.period
FROM budgets b
JOIN categories c ON b.category_id = c.id
WHERE b.is_active = true
ORDER BY percentage_used DESC;
