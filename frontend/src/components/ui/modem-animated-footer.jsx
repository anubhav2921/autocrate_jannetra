import React from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Twitter,
  Linkedin,
  Github,
  Mail,
  ShieldCheck,
  Brain
} from "lucide-react";

import { cn } from "../../lib/utils";
import "./modem-animated-footer.css";

export const Footer = ({
  brandName = "JanNetra",
  brandDescription = "AI-powered civic intelligence & problem detection platform for proactive governance and community action.",
  socialLinks = [],
  navLinks = [],
  creatorName = "Deepak Modi",
  creatorUrl = "https://deepakmodi.tech",
  brandIcon,
  className,
}) => {
  const defaultSocialLinks = socialLinks.length > 0 ? socialLinks : [
    { icon: <Twitter size={20} />, href: "https://twitter.com", label: "Twitter" },
    { icon: <Linkedin size={20} />, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: <Github size={20} />, href: "https://github.com", label: "GitHub" },
    { icon: <Mail size={20} />, href: "mailto:contact@jannetra.gov.in", label: "Email" },
  ];

  const defaultNavLinks = navLinks.length > 0 ? navLinks : [
    { label: "How It Works", href: "#how" },
    { label: "Live Issues", href: "#alerts" },
    { label: "Live Pulse", href: "/pulse" },
    { label: "Report Issue", href: "/report-issue" },
    { label: "Officer Login", href: "/login" },
  ];

  return (
    <section className={cn("animated-footer-section", className)}>
      <footer className="animated-footer">
        <div className="animated-footer-content">
          <div className="footer-brand-block">
            <div className="footer-brand-title">
              {brandName}
            </div>
            <p className="footer-brand-desc">
              {brandDescription}
            </p>

            {defaultSocialLinks.length > 0 && (
              <div className="footer-social-links">
                {defaultSocialLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.href}
                    className="footer-social-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            )}

            {defaultNavLinks.length > 0 && (
              <div className="footer-nav-row">
                {defaultNavLinks.map((link, index) => (
                  link.href.startsWith("#") ? (
                    <a
                      key={index}
                      className="footer-nav-item"
                      href={link.href}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={index}
                      className="footer-nav-item"
                      to={link.href}
                    >
                      {link.label}
                    </Link>
                  )
                ))}
              </div>
            )}
          </div>

          <div className="footer-bottom-row">
            <p>
              ©{new Date().getFullYear()} {brandName}. Built for Public Good & AI Governance.
            </p>
            {creatorName && creatorUrl && (
              <a
                href={creatorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-credit-link"
              >
                Crafted with care by {creatorName}
              </a>
            )}
          </div>
        </div>

        {/* Large background watermark text */}
        <div className="footer-giant-watermark">
          {brandName.toUpperCase()}
        </div>

        {/* Bottom glowing brand logo badge */}
        <div className="footer-floating-badge">
          <div className="footer-icon-glow">
            {brandIcon || (
              <Brain size={28} />
            )}
          </div>
        </div>

        {/* Bottom accent glowline */}
        <div className="footer-bottom-glowline" />
      </footer>
    </section>
  );
};

export default Footer;
