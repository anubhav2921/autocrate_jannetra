import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Link } from "react-router-dom";
import { Twitter, Linkedin, Github, Mail, Activity, Sparkles } from "lucide-react";
import "./CrowdCanvas.css";

export const CrowdCanvas = ({
  src = "/images/peeps/all-peeps.png",
  rows = 15,
  cols = 7,
  className = ""
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const config = {
      src,
      rows,
      cols,
    };

    // UTILS
    const randomRange = (min, max) => min + Math.random() * (max - min);
    const randomIndex = (array) => randomRange(0, array.length) | 0;
    const removeFromArray = (array, i) => array.splice(i, 1)[0];
    const removeItemFromArray = (array, item) => removeFromArray(array, array.indexOf(item));
    const removeRandomFromArray = (array) => removeFromArray(array, randomIndex(array));
    const getRandomFromArray = (array) => array[randomIndex(array) | 0];

    // TWEEN FACTORIES
    const resetPeep = ({ stage, peep }) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const offsetY = 100 - 250 * gsap.parseEase("power2.in")(Math.random());
      const startY = stage.height - peep.height + offsetY;
      let startX;
      let endX;

      if (direction === 1) {
        startX = -peep.width;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + peep.width;
        endX = 0;
        peep.scaleX = -1;
      }

      peep.x = startX;
      peep.y = startY;
      peep.anchorY = startY;

      return {
        startX,
        startY,
        endX,
      };
    };

    const normalWalk = ({ peep, props }) => {
      const { startX, startY, endX } = props;
      const xDuration = 10;
      const yDuration = 0.25;

      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.5, 1.5));
      tl.to(
        peep,
        {
          duration: xDuration,
          x: endX,
          ease: "none",
        },
        0
      );
      tl.to(
        peep,
        {
          duration: yDuration,
          repeat: xDuration / yDuration,
          yoyo: true,
          y: startY - 10,
        },
        0
      );

      return tl;
    };

    const walks = [normalWalk];

    const createPeep = ({ image, rect }) => {
      const peep = {
        image,
        rect: [],
        width: 0,
        height: 0,
        drawArgs: [],
        x: 0,
        y: 0,
        anchorY: 0,
        scaleX: 1,
        walk: null,
        setRect: (r) => {
          peep.rect = r;
          peep.width = r[2];
          peep.height = r[3];
          peep.drawArgs = [peep.image, ...r, 0, 0, peep.width, peep.height];
        },
        render: (c) => {
          c.save();
          c.translate(peep.x, peep.y);
          c.scale(peep.scaleX, 1);
          c.drawImage(
            peep.image,
            peep.rect[0],
            peep.rect[1],
            peep.rect[2],
            peep.rect[3],
            0,
            0,
            peep.width,
            peep.height
          );
          c.restore();
        },
      };

      peep.setRect(rect);
      return peep;
    };

    const img = document.createElement("img");
    const stage = {
      width: 0,
      height: 0,
    };

    const allPeeps = [];
    const availablePeeps = [];
    const crowd = [];

    const createPeeps = () => {
      const { rows: r, cols: c } = config;
      const { naturalWidth: width, naturalHeight: height } = img;
      const total = r * c;
      const rectWidth = width / r;
      const rectHeight = height / c;

      for (let i = 0; i < total; i++) {
        allPeeps.push(
          createPeep({
            image: img,
            rect: [
              (i % r) * rectWidth,
              ((i / r) | 0) * rectHeight,
              rectWidth,
              rectHeight,
            ],
          })
        );
      }
    };

    const addPeepToCrowd = () => {
      if (!availablePeeps.length) return null;
      const peep = removeRandomFromArray(availablePeeps);
      const walk = getRandomFromArray(walks)({
        peep,
        props: resetPeep({
          peep,
          stage,
        }),
      }).eventCallback("onComplete", () => {
        removePeepFromCrowd(peep);
        addPeepToCrowd();
      });

      peep.walk = walk;
      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);

      return peep;
    };

    const initCrowd = () => {
      while (availablePeeps.length) {
        const p = addPeepToCrowd();
        if (p && p.walk) {
          p.walk.progress(Math.random());
        }
      }
    };

    const removePeepFromCrowd = (peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const render = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      crowd.forEach((peep) => {
        peep.render(ctx);
      });

      ctx.restore();
    };

    const resize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      stage.width = canvas.clientWidth;
      stage.height = canvas.clientHeight;
      canvas.width = stage.width * dpr;
      canvas.height = stage.height * dpr;

      crowd.forEach((peep) => {
        if (peep.walk) peep.walk.kill();
      });

      crowd.length = 0;
      availablePeeps.length = 0;
      availablePeeps.push(...allPeeps);

      initCrowd();
    };

    const init = () => {
      createPeeps();
      resize();
      gsap.ticker.add(render);
    };

    img.onload = init;
    img.src = config.src;

    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      gsap.ticker.remove(render);
      crowd.forEach((peep) => {
        if (peep.walk) peep.walk.kill();
      });
    };
  }, [src, rows, cols]);

  return <canvas ref={canvasRef} className={`crowd-canvas-el ${className}`} />;
};

export const CrowdFooter = ({
  brandName = "JanNetra",
  brandDescription = "AI-powered civic intelligence & problem detection platform. Empowering citizens and municipal authorities through continuous detection and verified action.",
  creatorName = "Deepak Modi",
  creatorUrl = "https://deepakmodi.tech"
}) => {
  const navLinks = [
    { label: "How It Works", href: "#how" },
    { label: "Live Issues", href: "#alerts" },
    { label: "System Pulse", href: "/pulse" },
    { label: "Report Civic Issue", href: "/report-issue" },
    { label: "Officer Portal", href: "/login" },
  ];

  const socialLinks = [
    { icon: <Twitter size={18} />, href: "https://twitter.com", label: "Twitter" },
    { icon: <Linkedin size={18} />, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: <Github size={18} />, href: "https://github.com", label: "GitHub" },
    { icon: <Mail size={18} />, href: "mailto:contact@jannetra.gov.in", label: "Email" },
  ];

  return (
    <section className="crowd-footer-section">
      <div className="crowd-footer-container">
        {/* Animated Peep Crowd Canvas */}
        <CrowdCanvas src="/images/peeps/all-peeps.png" rows={15} cols={7} />
        
        {/* Subtle Dark Gradient Overlay */}
        <div className="crowd-gradient-overlay" />

        {/* Footer Top Content */}
        <div className="crowd-footer-content">
          <div className="crowd-tagline-watermark">
            Community-Powered Urban Intelligence
          </div>
          <h2 className="crowd-brand-title">
            {brandName}
          </h2>
          <p className="crowd-brand-desc">
            {brandDescription}
          </p>

          <div className="crowd-nav-links">
            {navLinks.map((item, idx) => (
              item.href.startsWith("#") ? (
                <a key={idx} href={item.href} className="crowd-nav-item">
                  {item.label}
                </a>
              ) : (
                <Link key={idx} to={item.href} className="crowd-nav-item">
                  {item.label}
                </Link>
              )
            ))}
          </div>

          <div className="crowd-social-row">
            {socialLinks.map((s, idx) => (
              <a
                key={idx}
                href={s.href}
                className="crowd-social-btn"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Footer Bottom Credits */}
        <div className="crowd-footer-bottom">
          <p>© {new Date().getFullYear()} {brandName}. AI for Public Governance.</p>
          {creatorName && creatorUrl && (
            <a
              href={creatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#a1a1aa", textDecoration: "none" }}
            >
              Crafted with care by {creatorName}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};

export default CrowdFooter;
