'use client';

import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, ShoppingCart, Gift } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { createPublicClient, http } from 'viem';
import { chiliz } from '@/lib/chains';
import stakingABI from '@/abis/FTStakingABI.json';
import { isFanToken } from '@/lib/tokens';

interface NftRequirement {
  id: number;
  name: string;
  stake_token_amount: string;
  stake_token_symbol: string;
  stake_token_address: string;
  description: string;
  main_image_url: string;
}

interface TokenBalance {
  [tokenSymbol: string]: string;
}

export function NftRequirementsTab() {
  const [nftRequirements, setNftRequirements] = useState<NftRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance>({});
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  
  const { authenticated, user } = useUnifiedAuth();

  useEffect(() => {
    const fetchNftRequirements = async () => {
      try {
        const response = await fetch('/api/nft-requirements');
        if (!response.ok) {
          throw new Error('Falha ao carregar requisitos de NFTs');
        }
        const data = await response.json();
        // Filtrar CHZ no frontend como segurança adicional
        const filteredData = data.filter((nft: NftRequirement) => 
          nft.stake_token_symbol && 
          nft.stake_token_symbol.toUpperCase() !== 'CHZ'
        );
        setNftRequirements(filteredData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNftRequirements();
  }, []);

  // Buscar saldos de stake quando o usuário estiver autenticado e tivermos os requisitos
  useEffect(() => {
    const fetchStakeBalances = async () => {
      if (!authenticated || !user?.wallet?.address || nftRequirements.length === 0) {
        return;
      }

      setIsLoadingBalances(true);
      
      try {
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || '';
        const contractAddress = process.env.NEXT_PUBLIC_STAKE_CONTRACT;
        
        if (!rpcUrl || !contractAddress) {
          console.error('Configuração RPC ou contrato de stake ausente');
          return;
        }

        const client = createPublicClient({
          chain: chiliz,
          transport: http(rpcUrl)
        });

        // Buscar saldos de stake para cada token único
        const tokenMap = new Map<string, { address: string; symbol: string }>();
        nftRequirements.forEach(nft => {
          if (nft.stake_token_symbol && nft.stake_token_address) {
            tokenMap.set(nft.stake_token_symbol, {
              address: nft.stake_token_address,
              symbol: nft.stake_token_symbol
            });
          }
        });

        const balances: TokenBalance = {};

        for (const token of Array.from(tokenMap.values())) {
          try {
            const stakeData = await client.readContract({
              address: contractAddress as `0x${string}`,
              abi: stakingABI,
              functionName: 'getStakeData',
              args: [user.wallet.address as `0x${string}`, token.address as `0x${string}`, false]
            });

            if (stakeData && (stakeData as {totalStake?: bigint}).totalStake) {
              // Verificar se é fan token para determinar decimais
              const isFan = isFanToken({ id: '', symbol: token.symbol, name: '', description: '', address: token.address });
              const decimals = isFan ? 0 : 18;
              const divisor = 10 ** decimals;
              const totalStake = Number((stakeData as {totalStake: bigint}).totalStake) / divisor;
              
              balances[token.symbol] = totalStake.toString();
            } else {
              balances[token.symbol] = '0';
            }
          } catch (err) {
            console.error(`Erro ao buscar stake para ${token.symbol}:`, err);
            balances[token.symbol] = '0';
          }
        }

        setTokenBalances(balances);
      } catch (err) {
        console.error('Erro ao buscar saldos de stake:', err);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchStakeBalances();
  }, [authenticated, user, nftRequirements]);

  // Função auxiliar para verificar se o usuário está apto
  const isEligible = (tokenSymbol: string, requiredAmount: string): boolean => {
    const userBalance = parseFloat(tokenBalances[tokenSymbol] || '0');
    const required = parseFloat(requiredAmount);
    return userBalance >= required;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Requisitos de Stake para NFTs</h2>
          <p className="text-gray-600">
            Veja quanto você precisa fazer stake de cada token para resgatar os NFTs disponíveis.
          </p>
        </div>
        
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NFT</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4 text-red-600">Erro ao carregar requisitos</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (nftRequirements.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Nenhum NFT com requisitos de stake</h2>
        <p className="text-gray-600">
          Atualmente não há NFTs que requerem stake para resgate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Requisitos de Stake para NFTs</h2>
        <p className="text-gray-600">
          Veja quanto você precisa fazer stake de cada token para resgatar os NFTs disponíveis.
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NFT</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nftRequirements.map((nft, index) => {
              const eligible = authenticated ? isEligible(nft.stake_token_symbol, nft.stake_token_amount) : false;
              
              return (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                        {nft.main_image_url ? (
                          <Image
                            src={nft.main_image_url}
                            alt={nft.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                            NFT
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{nft.name}</div>
                        <div className="text-xs text-gray-500 max-w-[200px] truncate">
                          {nft.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {nft.stake_token_symbol}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      {nft.stake_token_amount} {nft.stake_token_symbol}
                    </span>
                  </TableCell>
                  <TableCell>
                    {!authenticated ? (
                      <Badge variant="secondary">
                        Conecte a carteira
                      </Badge>
                    ) : isLoadingBalances ? (
                      <Badge variant="secondary">
                        Verificando...
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        {eligible ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                              Apto
                            </Badge>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <Badge variant="destructive">
                              Insuficiente
                            </Badge>
                          </>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {!authenticated ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled
                        className="flex items-center gap-1"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        Conecte a carteira
                      </Button>
                    ) : eligible ? (
                      <Link 
                        href={`/mint/${nft.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button 
                          size="sm" 
                          variant="default"
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <Gift className="h-3 w-3" />
                          Resgatar
                        </Button>
                      </Link>
                    ) : (
                      <Link 
                        href={`/buy-pix?token=${nft.stake_token_symbol.toLowerCase()}&amount=${nft.stake_token_amount}&amountType=token`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          Comprar
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {authenticated && (
        <div className="space-y-2">
          <div className="text-sm text-gray-500 text-center">
            * Status baseado no saldo atual em stake dos tokens
          </div>
          {Object.entries(tokenBalances).length > 0 && (
            <div className="text-xs text-gray-400 text-center">
              Seus saldos em stake: {Object.entries(tokenBalances)
                .map(([symbol, balance]) => `${balance} ${symbol}`)
                .join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 