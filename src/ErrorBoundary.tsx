import React from 'react';

interface State { hasError: boolean; error: string; }

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, State> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: '' }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message + '\n' + error.stack?.slice(0,500) }; }
  componentDidCatch(error: Error, info: any) { console.error('React Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background:'#fff', color:'#c00', padding:20,
          fontFamily:'monospace', fontSize:13, whiteSpace:'pre-wrap',
          minHeight:'100vh', overflowY:'auto'
        }}>
          <div style={{background:'#e63946',color:'#fff',padding:'10px 16px',marginBottom:16,borderRadius:8,fontSize:16,fontWeight:900}}>
            ⚠️ C7 WINNERS ERROR
          </div>
          <pre style={{background:'#fff3f3',padding:12,borderRadius:8,fontSize:11,overflow:'auto'}}>{this.state.error}</pre>
          <button onClick={() => window.location.reload()}
            style={{marginTop:16,padding:'10px 20px',background:'#e63946',border:'none',borderRadius:8,color:'#fff',cursor:'pointer',fontSize:14,fontWeight:700}}>
            🔄 Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
