'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PlusCircle, Edit, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { StakingToken as StakingTokenBase } from '@/lib/tokens'; // Interface base
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

// Nova interface para refletir a estrutura da tabela `staking_tokens` do DB
interface StakingTokenDbRecord {
  id: number; // Chave primária SERIAL do banco
  token_id_internal: string; // O "id" textual como 'chz', 'mengo'
  symbol: string;
  name: string;
  description?: string | null;
  address: string;
  icon_url?: string | null;
  decimals: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminStakingTokensPage() {
  const [tokens, setTokens] = useState<StakingTokenDbRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/staking-tokens');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Falha ao buscar tokens');
      }
      const data: StakingTokenDbRecord[] = await response.json();
      setTokens(data);
    } catch (err) {
      console.error("Erro ao buscar tokens:", err);
      const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(message);
      toast.error(`Erro ao carregar tokens: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const toggleTokenStatus = async (tokenId: number) => {
    const token = tokens.find(t => t.id === tokenId);
    if (!token) return;

    const originalStatus = token.is_active;
    setTokens(prevTokens => 
      prevTokens.map(t => t.id === tokenId ? { ...t, is_active: !t.is_active } : t)
    );
    
    try {
      const response = await fetch(`/api/staking-tokens/${tokenId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Falha ao alterar status do token');
      }
      const updatedToken = await response.json();
      setTokens(prevTokens => 
        prevTokens.map(t => t.id === tokenId ? { ...t, is_active: updatedToken.is_active, updated_at: updatedToken.updated_at || new Date().toISOString() } : t)
      );
      toast.success(`Status do token "${updatedToken.name}" alterado com sucesso.`);
    } catch (err) {
      setTokens(prevTokens => 
        prevTokens.map(t => t.id === tokenId ? { ...t, is_active: originalStatus } : t)
      );
      const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      console.error("Erro ao alterar status do token:", err);
      toast.error(`Erro ao alterar status: ${message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-lg">Carregando tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gerenciar Tokens de Stake</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTokens} disabled={isLoading} className="hidden sm:flex">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Link href="/adm/staking-tokens/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Token
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Erro! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {tokens.length === 0 && !isLoading && !error && (
         <div className="text-center py-10 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum token encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">Comece adicionando um novo token de stake.</p>
            <div className="mt-6">
              <Link href="/adm/staking-tokens/new">
                 <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Token
                 </Button>
              </Link>
            </div>
        </div>
      )}

      {tokens.length > 0 && (
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] hidden sm:table-cell">Ícone</TableHead>
                <TableHead>Nome (Símbolo)</TableHead>
                <TableHead className="hidden md:table-cell">ID Interno</TableHead>
                <TableHead className="hidden lg:table-cell">Endereço</TableHead>
                <TableHead className="text-center">Decimais</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="hidden sm:table-cell">
                    {token.icon_url ? (
                      <img src={token.icon_url} alt={token.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        {token.symbol.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">{token.name}</div>
                    <div className="text-sm text-gray-500">{token.symbol}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-600">{token.token_id_internal}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-gray-500 truncate max-w-xs">{token.address}</TableCell>
                  <TableCell className="text-center text-sm text-gray-600">{token.decimals}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={token.is_active ? 'default' : 'destructive'} className="cursor-pointer transition-colors hover:bg-opacity-80"
                           onClick={() => toggleTokenStatus(token.id)} >
                      {token.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/adm/staking-tokens/${token.id}/edit`}>
                        <Button variant="outline" size="icon">
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      </Link>
                      <Button variant={token.is_active ? "outline" : "secondary"} 
                              className={token.is_active ? "hover:bg-red-500 hover:text-white" : "hover:bg-green-500 hover:text-white"}
                              size="icon" 
                              onClick={() => toggleTokenStatus(token.id)}>
                        {token.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{token.is_active ? 'Desativar' : 'Ativar'}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 