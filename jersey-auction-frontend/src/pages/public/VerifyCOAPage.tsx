import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ShieldCheck, ShieldAlert, Award, FileText, CheckCircle } from 'lucide-react';

export const VerifyCOAPage: React.FC = () => {
  const { coaNumber: paramCoaNumber } = useParams<{ coaNumber: string }>();
  const navigate = useNavigate();

  const [coaInput, setCoaInput] = useState('');
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCOA = async (number: string) => {
    setLoading(true);
    setError('');
    setCert(null);
    try {
      const response = await api.get(`/certificates/verify/${number}`);
      setCert(response.data);
    } catch (err: any) {
      console.error(err);
      setError('Certificate not found or invalid COA number.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramCoaNumber) {
      setCoaInput(paramCoaNumber);
      fetchCOA(paramCoaNumber);
    }
  }, [paramCoaNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coaInput.trim()) return;
    navigate(`/verify/${coaInput.trim()}`);
  };

  const defaultPlaceholder = 'https://images.unsplash.com/photo-1540747737956-37872404a8c1?q=80&w=600&auto=format&fit=crop';
  const getFullImgUrl = (url: string) => {
    return url ? (url.startsWith('http') ? url : `http://localhost:5000${url}`) : defaultPlaceholder;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* COA search box card */}
      <Card className="bg-brand-navy-light/10 border-slate-800 p-8 shadow-premium rounded-3xl text-center mb-8">
        <div className="flex justify-center mb-3">
          <Award className="text-brand-gold h-10 w-10" />
        </div>
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-100">
          Verify Authenticity Certificate (COA)
        </h1>
        <p className="text-xs text-slate-500 mt-2 max-w-lg mx-auto">
          Enter the unique certificate barcode number printed on your LelangBID hologram seal to verify item matches and certificate details.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 max-w-xl mx-auto grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-stretch">
          <div className="[&>div]:mb-0">
            <Input
              type="text"
              placeholder="e.g. COA-CR7-MU0708-001"
              value={coaInput}
              onChange={(e) => setCoaInput(e.target.value)}
              disabled={loading}
              className="h-[52px] py-0"
            />
          </div>
          <Button type="submit" variant="gold" loading={loading} className="h-[52px] px-6 py-0 uppercase tracking-widest text-xs whitespace-nowrap">
            Verify COA
          </Button>
        </form>
      </Card>

      {/* COA verification details display */}
      {error && (
        <Card className="bg-brand-accent-red/5 border-brand-accent-red/25 p-6 rounded-2xl flex items-center space-x-4">
          <ShieldAlert className="text-brand-accent-red shrink-0" size={32} />
          <div>
            <h4 className="text-sm font-black uppercase tracking-wide text-brand-accent-red">Invalid Certificate</h4>
            <p className="text-xs text-slate-450 mt-1">
              We could not find any records associated with Certificate No. <strong>{coaInput}</strong>. Please ensure characters are entered correctly.
            </p>
          </div>
        </Card>
      )}

      {cert && (
        <Card className="bg-brand-navy-light/20 border-slate-800 p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between border-b border-slate-800 pb-5">
            <div className="flex items-center space-x-3 mb-4 sm:mb-0">
              <CheckCircle className="text-brand-accent-green" size={28} />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Verification Status</span>
                <span className="text-lg font-mono font-black text-slate-200">{cert.coa_number}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant={cert.status === 'valid' ? 'success' : 'closed'} className="py-1 px-3.5 text-xs font-black">
                Certificate {cert.status}
              </Badge>
            </div>
          </div>

          {/* Jersey Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Thumbnail */}
            <div className="md:col-span-4 aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
              <img
                src={getFullImgUrl(cert.main_image)}
                alt={cert.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Spec sheet */}
            <div className="md:col-span-8 space-y-4">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-100">
                {cert.title}
              </h2>

              <div className="grid grid-cols-2 gap-3.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Player Backname</span>
                  <span className="text-slate-300 font-bold block">{cert.player_name || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Club / Team</span>
                  <span className="text-slate-300 font-bold block">{cert.club_name || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">League / Season</span>
                  <span className="text-slate-300 font-bold block">{cert.league_name || '-'} ({cert.season || '-'})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Collectible Type</span>
                  <span className="text-slate-300 font-bold block uppercase">{cert.jersey_type?.replace(/-/g, ' ') || 'Replica'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Signed Jersey</span>
                  <span className="text-slate-300 font-bold block">{cert.is_signed === 1 ? 'Yes, Hand Signed' : 'No'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Verifier Name</span>
                  <span className="text-slate-300 font-bold block">{cert.verifier_name || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Authenticator Verification Notes</h4>
            <p className="text-xs text-slate-450 leading-relaxed">
              This LelangBid item has been carefully inspected and examined by the verification officers of LelangBID. By matching weave structure, brand badges, stitching techniques, player number materials, and event specifics, this item is certified authentic and original.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
export default VerifyCOAPage;
