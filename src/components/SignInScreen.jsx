import React, { useState, useEffect } from 'react';
import { Sparkles, Mail, Shield, ArrowRight, User } from 'lucide-react';
import {
  initGoogleSignIn,
  renderGoogleButton,
  GOOGLE_CLIENT_ID,
} from '../services/authService';
import { ROLE_KEEPER, ROLE_OWNER, registerStaffAccount, userFromSheetRow } from '../services/roles';
import { lookupStaffOnSheet, requestOwnerOtp, verifyOwnerOtp } from '../services/n8nService';
import { useI18n } from '../services/i18n.jsx';

export function SignInScreen({ onSignIn, onContinueAsGuest }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [otpSentTo, setOtpSentTo] = useState('');
  const [otpPurpose, setOtpPurpose] = useState('signup');
  const [role, setRole]       = useState(ROLE_OWNER);
  const hasRealClientId = GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

  useEffect(() => {
    if (!hasRealClientId) return;
    // Load Google Identity Services script
    const script = document.getElementById('google-gsi-script');
    if (!script) {
      const s = document.createElement('script');
      s.id  = 'google-gsi-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => {
        initGoogleSignIn((user) => { onSignIn(user); });
        setTimeout(() => renderGoogleButton('google-sign-in-btn'), 100);
      };
      document.head.appendChild(s);
    } else {
      initGoogleSignIn((user) => { onSignIn(user); });
      setTimeout(() => renderGoogleButton('google-sign-in-btn'), 100);
    }
  }, []);

  const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const explainOtp = (payload) => {
    const msg = String(payload?.message || '');
    if (/owner/i.test(msg)) return t('signin.ownerExists');
    if (/expired/i.test(msg)) return t('signin.otpExpired');
    if (/match|wrong/i.test(msg)) return t('signin.otpWrong');
    if (/many|wait/i.test(msg)) return t('signin.otpWait');
    if (/email/i.test(msg)) return t('signin.otpNeedEmail');
    return t('signin.otpFailed');
  };

  const handleForgotPassword = async () => {
    setError(null);
    const typedEmail = email.trim();
    if (name.trim().length < 2 || String(phone).replace(/\D/g, '').length < 6) {
      setError(t('signin.invalid'));
      return;
    }
    if (!emailOk(typedEmail)) {
      setError(t('signin.otpNeedEmail'));
      return;
    }
    setRole(ROLE_OWNER);
    setLoading(true);
    await sendOwnerCode(typedEmail, 'reset');
    setLoading(false);
  };

  const sendOwnerCode = async (typedEmail, purpose) => {
    const sent = await requestOwnerOtp({ name, phone, email: typedEmail, purpose });
    if (!sent.connected || !sent.sent) {
      setError(explainOtp(sent));
      return false;
    }
    setOtpPurpose(purpose);
    setOtpSentTo(typedEmail.toLowerCase());
    setCode('');
    return true;
  };

  const handleStaffSignIn = async () => {
    setError(null);
    const typedEmail = email.trim();
    if (name.trim().length < 2 || String(phone).replace(/\D/g, '').length < 6) {
      setError(t('signin.invalid'));
      return;
    }
    if (typedEmail && !emailOk(typedEmail)) {
      setError(t('signin.emailInvalid'));
      return;
    }
    setLoading(true);

    if (role === ROLE_OWNER) {
      if (!typedEmail) {
        setLoading(false);
        setError(t('signin.otpNeedEmail'));
        return;
      }
      if (otpSentTo && otpSentTo === typedEmail.toLowerCase()) {
        if (String(code).replace(/\D/g, '').length < 6) {
          setLoading(false);
          setError(t('signin.otpWrong'));
          return;
        }
        const verified = await verifyOwnerOtp({
          name, phone, email: typedEmail, code, purpose: otpPurpose,
        });
        setLoading(false);
        if (!verified.connected || !verified.verified) {
          setError(explainOtp(verified));
          return;
        }
        const sheetUser = userFromSheetRow({ ...verified, role: ROLE_OWNER });
        if (!sheetUser) {
          setError(t('signin.otpFailed'));
          return;
        }
        onSignIn(sheetUser);
        return;
      }
      await sendOwnerCode(typedEmail, 'signup');
      setLoading(false);
      return;
    }

    if (otpSentTo && otpSentTo === typedEmail.toLowerCase()) {
      setLoading(false);
      setError(t('signin.otpWrong'));
      return;
    }

    const sheet = await lookupStaffOnSheet({ phone, name });
    if (!sheet.connected) {
      const result = registerStaffAccount({ name, phone, email: typedEmail, role });
      setLoading(false);
      if (result.error === 'inactive') {
        setError(t('signin.inactive'));
        return;
      }
      if (result.error) {
        setError(t('signin.invalid'));
        return;
      }
      onSignIn(result.user);
      return;
    }

    if (sheet.found) {
      const sheetUser = userFromSheetRow(sheet);
      setLoading(false);
      if (!sheetUser || sheetUser.active === 'No') {
        setError(t('signin.inactive'));
        return;
      }
      onSignIn(sheetUser);
      return;
    }

    setLoading(false);
    setError(t('signin.notOnSheet'));
  };

  return (
    <div className="signin-screen">
      {/* Background glow */}
      <div className="signin-glow signin-glow-1" />
      <div className="signin-glow signin-glow-2" />

      {/* Logo */}
      <div className="signin-logo-area">
        <div className="signin-logo-orb">
          <Sparkles size={28} color="#6366f1" />
        </div>
        <div className="signin-brand">Trendy</div>
        <div className="signin-tagline">{t('signin.tagline')}</div>
      </div>

      <div className="signin-card">
        <div className="signin-card-title">{t('signin.welcome')}</div>
        <div className="signin-card-sub">
          {t('signin.sub')}
        </div>

        {/* Google Sign-In button */}
        {hasRealClientId ? (
          <div id="google-sign-in-btn" className="google-btn-wrapper" />
        ) : null}

        <label className="staff-field">
          <span>{t('signin.name')}</span>
          <input value={name} onChange={(e) => { setName(e.target.value); setOtpSentTo(''); }} autoComplete="name" />
        </label>
        <label className="staff-field">
          <span>{t('signin.phone')}</span>
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setOtpSentTo(''); }} inputMode="tel" autoComplete="tel" placeholder="09…" />
        </label>
        <label className="staff-field">
          <span>{t('signin.email')}</span>
          <input value={email} onChange={(e) => { setEmail(e.target.value); setOtpSentTo(''); }} type="email" inputMode="email" autoComplete="email" placeholder="name@email.com" />
        </label>

        {otpSentTo && (
          <>
            <p className="staff-otp-note">
              {otpPurpose === 'reset' ? t('signin.otpReset', { email: otpSentTo }) : t('signin.otpSent', { email: otpSentTo })}
            </p>
            <label className="staff-field">
              <span>{t('signin.otpCode')}</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
            </label>
            <button type="button" className="staff-otp-resend" onClick={handleForgotPassword} disabled={loading}>
              {t('signin.otpResend')}
            </button>
          </>
        )}

        <div className="staff-role-label">{t('signin.role')}</div>
        <div className="staff-role-row">
          <button
            type="button"
            className={`staff-role ${role === ROLE_OWNER ? 'on' : ''}`}
            onClick={() => { setRole(ROLE_OWNER); setOtpSentTo(''); }}
          >
            <strong>{t('signin.owner')}</strong>
            <span>{t('signin.ownerHint')}</span>
          </button>
          <button
            type="button"
            className={`staff-role ${role === ROLE_KEEPER ? 'on' : ''}`}
            onClick={() => { setRole(ROLE_KEEPER); setOtpSentTo(''); }}
          >
            <strong>{t('signin.keeper')}</strong>
            <span>{t('signin.keeperHint')}</span>
          </button>
        </div>

        <button
          className={`google-demo-btn ${loading ? 'loading' : ''}`}
          onClick={handleStaffSignIn}
          disabled={loading}
        >
          {loading
            ? <><span className="signin-spinner" />{t('signin.signing')}</>
            : (otpSentTo ? t('signin.otpVerify') : t('signin.google'))}
        </button>

        <button type="button" className="staff-otp-resend" onClick={handleForgotPassword} disabled={loading}>
          {t('signin.forgot')}
        </button>

        {error && (
          <div className="signin-error">{error}</div>
        )}

        {/* Divider */}
        <div className="signin-divider">
          <span />{t('signin.or')}<span />
        </div>

        {/* Continue as Guest */}
        <button className="signin-guest-btn" onClick={onContinueAsGuest}>
          <User size={15} />
          {t('signin.guest')}
          <ArrowRight size={13} />
        </button>

        {/* Privacy note */}
        <div className="signin-privacy">
          <Shield size={11} color="#10b981" />
          {t('signin.privacy')}
        </div>
      </div>

      {/* Footer */}
      <div className="signin-footer">
        <Mail size={11} />
        {t('signin.footer')}
      </div>
    </div>
  );
}
