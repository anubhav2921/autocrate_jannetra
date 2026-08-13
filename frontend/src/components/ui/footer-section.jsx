import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Brain,
  Twitter,
  Linkedin,
  Github,
  Mail,
  Activity,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import './footer-section.css';

const defaultFooterLinks = [
  {
    label: 'Product',
    links: [
      { title: 'How It Works', href: '#how' },
      { title: 'Live Issues', href: '#alerts' },
      { title: 'System Pulse', href: '/pulse' },
      { title: 'Report Problem', href: '/report-issue' },
    ],
  },
  {
    label: 'Platform',
    links: [
      { title: 'Signal Monitor', href: '/signal-monitor' },
      { title: 'Officer Portal', href: '/login' },
      { title: 'Transparency', href: '/legal/transparency' },
      { title: 'Resolution Feed', href: '/pulse' },
    ],
  },
  {
    label: 'Governance',
    links: [
      { title: 'AI Detection', href: '#how' },
      { title: 'Civic Data Hub', href: '/pulse' },
      { title: 'Privacy Policy', href: '/legal/privacy' },
      { title: 'Terms of Service', href: '/legal/terms' },
    ],
  },
  {
    label: 'Community',
    links: [
      { title: 'Twitter / X', href: 'https://twitter.com', icon: Twitter },
      { title: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
      { title: 'GitHub', href: 'https://github.com', icon: Github },
      { title: 'Support Email', href: 'mailto:contact@jannetra.gov.in', icon: Mail },
    ],
  },
];

function AnimatedContainer({ className = '', delay = 0.1, children }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Footer({
  brandName = "JanNetra",
  brandDescription = "AI-powered civic intelligence & problem detection platform. Empowering citizens through real-time transparency and automated governance.",
  footerLinks = defaultFooterLinks
}) {
  return (
    <section className="modern-footer-wrapper">
      <footer className="modern-footer-container">
        <div className="footer-top-glow" />

        <div className="footer-grid-layout">
          <AnimatedContainer className="footer-brand-side">
            <div className="footer-brand-logo">
              <div className="brand-icon-box">
                <Brain size={22} />
              </div>
              <span>{brandName}</span>
            </div>
            <p className="footer-copyright" style={{ maxWidth: 360 }}>
              {brandDescription}
            </p>
            <p className="footer-copyright" style={{ marginTop: 'auto' }}>
              © {new Date().getFullYear()} {brandName}. Built for Public Governance.
            </p>
          </AnimatedContainer>

          <div className="footer-columns-group">
            {footerLinks.map((section, index) => (
              <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
                <div>
                  <h3 className="footer-col-title">{section.label}</h3>
                  <ul className="footer-col-list">
                    {section.links.map((link) => (
                      <li key={link.title}>
                        {link.href.startsWith('#') ? (
                          <a href={link.href} className="footer-link-item">
                            {link.icon && <link.icon size={15} />}
                            {link.title}
                          </a>
                        ) : link.href.startsWith('http') || link.href.startsWith('mailto') ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="footer-link-item"
                          >
                            {link.icon && <link.icon size={15} />}
                            {link.title}
                          </a>
                        ) : (
                          <Link to={link.href} className="footer-link-item">
                            {link.icon && <link.icon size={15} />}
                            {link.title}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedContainer>
            ))}
          </div>
        </div>
      </footer>
    </section>
  );
}

export default Footer;
