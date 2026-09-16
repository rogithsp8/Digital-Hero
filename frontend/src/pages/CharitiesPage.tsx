import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CharitiesPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['charities', search],
    queryFn: () => api.get('/charities', { params: { search: search || undefined } }).then(r => r.data),
    staleTime: 30_000,
  });

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Charities</h1>
          <p className="text-white/50">Every subscription supports a cause. Choose yours.</p>
        </div>

        <input
          type="search"
          placeholder="Search charities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input max-w-md mb-10"
        />

        {isLoading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {data?.map((c: any) => (
              <Link key={c.id} to={`/charities/${c.slug}`}>
                <div className="card hover:border-brand-500/30 transition-all hover:-translate-y-1 h-full">
                  {c.image_url && (
                    <img src={c.image_url} alt={c.name} className="w-full h-36 object-cover rounded-xl mb-4" />
                  )}
                  {c.is_featured && (
                    <span className="badge bg-accent-400/20 text-accent-400 mb-2">Featured</span>
                  )}
                  <h3 className="font-semibold mb-1">{c.name}</h3>
                  <p className="text-white/50 text-sm line-clamp-3">{c.description}</p>
                </div>
              </Link>
            ))}
            {data?.length === 0 && (
              <p className="text-white/40 col-span-3 text-center py-12">No charities found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
