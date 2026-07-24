import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SupabaseTest() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    async function testConnection() {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        setStatus('✅ Supabase connected');
      } catch (err) {
        setStatus('❌ Supabase connection failed');
      }
    }

    testConnection();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "28px",
        fontWeight: "bold",
      }}
    >
      {status}
    </div>
  );
}