import React from 'react';
import {isSupabaseConfigured} from '../lib/supabase';
import './GlobalErrorBoundary.css';

export default class GlobalErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={error:null}}
 static getDerivedStateFromError(error){return{error}}
 componentDidCatch(error,info){if(process.env.NODE_ENV==='development')console.error('Aureqin runtime boundary',error,info);this.props.onError?.({error,info,at:new Date().toISOString()})}
 render(){if(!this.state.error)return this.props.children;return <main className="ax-error-boundary" role="alert"><section><span>AUREQIN · RECOVERY</span><h1>Something went wrong</h1><p>Aureqin could not load this page correctly.<br/>Your saved project information has not been intentionally deleted.</p><div><button className="btn-primary" onClick={()=>this.setState({error:null})}>Try Again</button><button className="btn-secondary" onClick={()=>window.location.reload()}>Refresh</button><a className="btn-secondary" href="/">Return Home</a>{!isSupabaseConfigured&&<a className="btn-secondary" href="/signin">Sign In</a>}</div><small>{navigator.onLine?'The page encountered an unexpected runtime error.':'You appear to be offline. Local drafts remain available and sync can retry after reconnection.'}</small></section></main>}
}
