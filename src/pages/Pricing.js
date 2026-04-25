import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Pricing.css';

const features = [
  { icon: '📊', title: '40+ Analysis Tools', desc: 'Every tool a quality professional needs — from control charts to DOE to hypothesis testing.' },
  { icon: '🗂️', title: 'Central Data Worksheet', desc: 'Enter your data once and send it to any analysis tool instantly. No re-uploading.' },
  { icon: '🧪', title: 'Full Hypothesis Testing', desc: '20+ tests including t-tests, ANOVA, Mann-Whitney, Chi-Square, and regression.' },
  { icon: '⚗️', title: 'Design of Experiments', desc: 'Full factorial, fractional factorial, and Plackett-Burman designs with analysis.' },
  { icon: '📋', title: 'Professional Templates', desc: 'Project Charter, SIPOC, FMEA, COPQ, Cost-Benefit and more — export to PDF or Word.' },
  { icon: '🖨️', title: 'Export & Print', desc: 'Export any analysis to PDF. Print-ready layouts for every tool output.' },
  { icon: '☀️', title: 'Light & Dark Mode', desc: 'Comfortable to use in any environment — toggle between modes instantly.' },
  { icon: '🌐', title: 'Browser-Based', desc: 'No installation, no IT department needed. Works on any device with a browser.' },
];

const testimonials = [
  { name: 'Sarah M.', role: 'Black Belt, Healthcare', text: 'Finally a Minitab alternative that doesn\'t cost $2,000/year. I use this every single day for my DMAIC projects.' },
  { name: 'James K.', role: 'Quality Manager, Manufacturing', text: 'The hypothesis testing and DOE tools are exactly what I needed. The central worksheet saves me so much time.' },
  { name: 'Priya R.', role: 'Green Belt, Financial Services', text: 'The templates alone are worth the subscription. Project Charter and SIPOC ready in minutes.' },
];

const faqs = [
  { q: 'Can I try it before subscribing?', a: 'Yes — the 14-day free trial gives you full access to every tool with no credit card required. Cancel anytime.' },
  { q: 'Do I need to install anything?', a: 'No. SixSigma Pro runs entirely in your browser. No downloads, no IT approval, no installation.' },
  { q: 'Is my data safe?', a: 'All analysis happens locally in your browser. Your data never leaves your computer or gets sent to any server.' },
  { q: 'Can I export my results?', a: 'Yes. Every analysis can be exported as PDF. Templates export as PDF or Word (.docx).' },
  { q: 'What if I need to cancel?', a: 'Cancel anytime from your account settings. No questions asked, no hidden fees.' },
  { q: 'Is it suitable for beginners?', a: 'Absolutely. Every tool includes guidance on when to use it, how to interpret results, and what the formulas mean.' },
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState(null);
  const [annual, setAnnual] = useState(false);

  const monthlyPrice = 9.99;
  const annualPrice = 7.99;

  return (
    <div className="pricing-page">

      {/* Hero */}
      <section className="pricing-hero">
        <div className="pricing-hero-badge">Professional Lean Six Sigma Platform</div>
        <h1>The statistical analysis platform quality professionals deserve</h1>
        <p>
          Everything Minitab does — at a fraction of the cost. Browser-based, no installation,
          full DMAIC toolkit with hypothesis testing, DOE, templates, and more.
        </p>
        <div className="pricing-hero-cta">
          <Link to="/worksheet" className="btn-primary" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
            Start 14-Day Free Trial
          </Link>
          <Link to="/" className="btn-secondary" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
            Explore the Tools
          </Link>
        </div>
        <p className="pricing-hero-note">No credit card required · Cancel anytime · Full access during trial</p>
      </section>

      {/* Social proof strip */}
      <div className="proof-strip">
        <span>Trusted by quality professionals in</span>
        <span className="proof-item">🏥 Healthcare</span>
        <span className="proof-item">🏭 Manufacturing</span>
        <span className="proof-item">✈️ Aerospace</span>
        <span className="proof-item">💊 Pharma</span>
        <span className="proof-item">🏦 Financial Services</span>
      </div>

      {/* Features */}
      <section className="pricing-features">
        <div className="pricing-section-header">
          <h2>Everything you need, nothing you don't</h2>
          <p>40+ professional tools across the full DMAIC framework</p>
        </div>
        <div className="features-grid">
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing card */}
      <section className="pricing-card-section">
        <div className="pricing-section-header">
          <h2>Simple, transparent pricing</h2>
          <p>One plan. Every feature. No hidden costs.</p>
        </div>

        <div className="billing-toggle">
          <span className={!annual ? 'active' : ''}>Monthly</span>
          <button className={`toggle-switch ${annual ? 'on' : ''}`} onClick={() => setAnnual(!annual)}>
            <span className="toggle-knob" />
          </button>
          <span className={annual ? 'active' : ''}>Annual <em>Save 20%</em></span>
        </div>

        <div className="pricing-card-wrapper">
          <div className="pricing-card-main">
            <div className="pricing-card-header">
              <div className="pricing-plan-name">SixSigma Pro</div>
              <div className="pricing-amount">
                <span className="price-currency">$</span>
                <span className="price-num">{annual ? annualPrice : monthlyPrice}</span>
                <span className="price-period">/month</span>
              </div>
              {annual && <div className="price-annual-note">Billed as ${(annualPrice * 12).toFixed(0)}/year</div>}
            </div>

            <ul className="pricing-features-list">
              {[
                'Full access to all 40+ analysis tools',
                'Central data worksheet',
                '20+ hypothesis tests (continuous, discrete, nonparametric)',
                'Design of Experiments (DOE)',
                'All professional templates (PDF + Word export)',
                'Export & print any analysis',
                'Light/dark mode',
                'Resources, guides & interpretation help',
                'Future tools included at no extra cost',
                'Cancel anytime',
              ].map(f => (
                <li key={f}><span className="check">✓</span>{f}</li>
              ))}
            </ul>

            <Link to="/worksheet" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '1rem' }}>
              Start Free 14-Day Trial
            </Link>
            <p className="pricing-card-note">No credit card required</p>

            <div className="vs-minitab">
              <div className="vs-label">vs. Minitab</div>
              <div className="vs-compare">
                <div className="vs-them"><span>Minitab</span><strong>$154+/mo</strong></div>
                <div className="vs-us"><span>SixSigma Pro</span><strong>${monthlyPrice}/mo</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="pricing-testimonials">
        <div className="pricing-section-header">
          <h2>What quality professionals say</h2>
        </div>
        <div className="testimonials-grid">
          {testimonials.map(t => (
            <div key={t.name} className="testimonial-card">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.name[0]}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="pricing-faq">
        <div className="pricing-section-header">
          <h2>Frequently asked questions</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
              <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {faq.q}
                <span className="faq-arrow">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <div className="faq-a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="pricing-final-cta">
        <h2>Ready to upgrade your quality toolkit?</h2>
        <p>Join quality professionals using SixSigma Pro to run better DMAIC projects.</p>
        <Link to="/worksheet" className="btn-primary" style={{ fontSize: '1rem', padding: '0.85rem 2.5rem' }}>
          Start Your Free Trial Today
        </Link>
        <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          14 days free · No credit card · Cancel anytime
        </p>
      </section>
    </div>
  );
}
