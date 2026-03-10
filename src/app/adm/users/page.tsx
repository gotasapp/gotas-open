'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash, Eye, CheckCircle, XCircle } from 'lucide-react';

interface User {
  id: number;
  wallet_address: string;
  email: string;
  username: string;
  super_user: boolean;
  created_at: string;
  updated_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Carregar usuários da API
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error('Erro ao carregar usuários:', response.status);
          setUsers([]);
        }
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Função para filtrar usuários baseado no termo de busca
  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para excluir um usuário
  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setUsers(users.filter((user) => user.id !== id));
        } else {
          console.error('Erro ao excluir usuário:', response.status);
          alert('Erro ao excluir usuário');
        }
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário');
      }
    }
  };

  // Função para alternar status de super usuário
  const toggleSuperUser = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${id}/toggle-super`, { 
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ super_user: !currentStatus })
      });
      
      if (response.ok) {
        setUsers(
          users.map((user) =>
            user.id === id ? { ...user, super_user: !currentStatus } : user
          )
        );
      } else {
        console.error('Erro ao atualizar status de super usuário:', response.status);
        alert('Erro ao atualizar status de super usuário');
      }
    } catch (error) {
      console.error('Erro ao atualizar status de super usuário:', error);
      alert('Erro ao atualizar status de super usuário');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-gray-500">Gerenciar usuários do sistema</p>
        </div>
        <Link
          href="/adm/users/new"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 sm:mt-0"
        >
          <Plus className="mr-1 h-4 w-4" /> Adicionar Usuário
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar usuários..."
            className="w-full rounded-md border border-gray-300 pl-8 pr-4 py-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                <th className="whitespace-nowrap px-4 py-3">Usuário</th>
                <th className="whitespace-nowrap px-4 py-3">Wallet</th>
                <th className="whitespace-nowrap px-4 py-3">Data de Registro</th>
                <th className="whitespace-nowrap px-4 py-3">Super User</th>
                <th className="whitespace-nowrap px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm">
                    Carregando usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="text-sm">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-xs text-gray-600">
                        {user.wallet_address.substring(0, 6)}...
                        {user.wallet_address.substring(user.wallet_address.length - 4)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {user.super_user ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/adm/users/${user.id}`}
                          className="rounded-md bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/adm/users/${user.id}/edit`}
                          className="rounded-md bg-blue-100 p-2 text-blue-600 hover:bg-blue-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="rounded-md bg-red-100 p-2 text-red-600 hover:bg-red-200"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleSuperUser(user.id, user.super_user)}
                          className={`rounded-md p-2 ${
                            user.super_user
                              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-600 hover:bg-green-200'
                          }`}
                          title={user.super_user ? 'Remover super usuário' : 'Tornar super usuário'}
                        >
                          {user.super_user ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}