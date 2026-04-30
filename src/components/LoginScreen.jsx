import { GoogleLogin } from '@react-oauth/google';

export default function LoginScreen({ onLoginSuccess }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-ink)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'var(--color-card)',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ margin: '0 0 16px 0', fontSize: '24px' }}>Dante Content Factory</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px', lineHeight: '1.5' }}>
          This system is restricted to authorized personnel. Please sign in with your Dante Labs Google account to continue.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              onLoginSuccess(credentialResponse.credential);
            }}
            onError={() => {
              console.error('Login Failed');
            }}
            theme="filled_black"
            size="large"
            text="continue_with"
            shape="rectangular"
          />
        </div>
      </div>
    </div>
  );
}
