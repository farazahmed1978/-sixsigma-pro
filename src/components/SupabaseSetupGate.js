import React from 'react';
import {Link} from 'react-router-dom';
import {isSupabaseConfigured} from '../lib/supabase';
import logo from '../assets/axentra-logo-dark.svg';
import './SupabaseSetupGate.css';

export default function SupabaseSetupGate({children}){
  if(isSupabaseConfigured)return children;
  return <div className="supabase-setup-screen" role="status">
    <section>
      <Link to="/"><img src={logo} alt="AUREQIN"/></Link>
      <span>DEVELOPMENT CONFIGURATION</span>
      <h1>Supabase has not been configured yet.</h1>
      <p>Account creation and sign-in require a Supabase project URL and public anonymous key. The rest of Aureqin and all existing local data remain unchanged.</p>
      <div><strong>To enable authentication</strong><ol><li>Create a Supabase project.</li><li>Copy <code>.env.example</code> to <code>.env.local</code>.</li><li>Add the Project URL and anon key.</li><li>Restart the development server.</li></ol></div>
      <small>This is a development configuration issue, not an account or application error.</small>
      <Link className="btn-secondary" to="/">Return to homepage</Link>
    </section>
  </div>;
}
