/* @ds-bundle: {"format":4,"namespace":"MySystemLifeDesignSystem_265e57","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"ProgressBar","sourcePath":"components/core/ProgressBar.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"BarChart","sourcePath":"components/data/BarChart.jsx"},{"name":"CarrierRow","sourcePath":"components/data/CarrierRow.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"DonutChart","sourcePath":"components/data/DonutChart.jsx"},{"name":"LineChart","sourcePath":"components/data/LineChart.jsx"},{"name":"MetricBarList","sourcePath":"components/data/MetricBarList.jsx"},{"name":"SelectionToolbar","sourcePath":"components/data/SelectionToolbar.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"OptionCard","sourcePath":"components/feedback/OptionCard.jsx"},{"name":"PromoBanner","sourcePath":"components/feedback/PromoBanner.jsx"},{"name":"PromoCard","sourcePath":"components/feedback/PromoCard.jsx"},{"name":"StepProgress","sourcePath":"components/feedback/StepProgress.jsx"},{"name":"SuccessDialog","sourcePath":"components/feedback/SuccessDialog.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"SearchInput","sourcePath":"components/forms/SearchInput.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"ChatListItem","sourcePath":"components/messaging/ChatListItem.jsx"},{"name":"MessageBubble","sourcePath":"components/messaging/MessageBubble.jsx"},{"name":"MessageComposer","sourcePath":"components/messaging/MessageComposer.jsx"},{"name":"PageHeader","sourcePath":"components/navigation/PageHeader.jsx"},{"name":"Pagination","sourcePath":"components/navigation/Pagination.jsx"},{"name":"Sidebar","sourcePath":"components/navigation/Sidebar.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"28984c7342d5","components/core/Badge.jsx":"ad3472fddb2f","components/core/Button.jsx":"cc1f43e0c14f","components/core/Card.jsx":"75956b2547b3","components/core/Icon.jsx":"e59ccee794c3","components/core/IconButton.jsx":"7192f93c6759","components/core/ProgressBar.jsx":"3b4e08fb898a","components/core/Tag.jsx":"76f83edcf31d","components/data/BarChart.jsx":"4c2c5c1b36c4","components/data/CarrierRow.jsx":"aa831e1c75d9","components/data/DataTable.jsx":"badaf395ed67","components/data/DonutChart.jsx":"22ed652429c2","components/data/LineChart.jsx":"fee93b052e58","components/data/MetricBarList.jsx":"5c317b6ea5a4","components/data/SelectionToolbar.jsx":"2122586857ef","components/data/StatCard.jsx":"f3901eed4445","components/feedback/Modal.jsx":"575714d88fd8","components/feedback/OptionCard.jsx":"f8ffc16310ac","components/feedback/PromoBanner.jsx":"cec9b735c033","components/feedback/PromoCard.jsx":"c9e5a95e6b34","components/feedback/StepProgress.jsx":"8660e89eac96","components/feedback/SuccessDialog.jsx":"755bf57691ee","components/forms/Checkbox.jsx":"ac5c71f1179f","components/forms/Radio.jsx":"646195d35111","components/forms/SearchInput.jsx":"8499244c21a7","components/forms/Select.jsx":"a63affa71072","components/forms/Switch.jsx":"eba0563f9ede","components/messaging/ChatListItem.jsx":"0498f964cb36","components/messaging/MessageBubble.jsx":"783449a66e7b","components/messaging/MessageComposer.jsx":"8bf9d2040019","components/navigation/PageHeader.jsx":"6b0b9932d551","components/navigation/Pagination.jsx":"e597359ed78f","components/navigation/Sidebar.jsx":"028fd73ce34b","components/navigation/TopBar.jsx":"76e27ebdfe8b","ui_kits/admin_desktop/AnalyticsScreen.jsx":"a43c383c53fc","ui_kits/admin_desktop/AutomationsScreen.jsx":"208c7b2148c7","ui_kits/admin_desktop/Brand.jsx":"ec43d677cfe5","ui_kits/admin_desktop/MessagesScreen.jsx":"b33ff1358b63","ui_kits/admin_desktop/OrdersScreen.jsx":"73b7d3bab02e","ui_kits/admin_desktop/OverviewScreen.jsx":"ee5929f04d36","ui_kits/admin_desktop/PlaceholderScreen.jsx":"12007fc02205","ui_kits/admin_desktop/data.js":"9eb2fcceb2ab","ui_kits/admin_mobile/MobileChrome.jsx":"b428a1812c32","ui_kits/admin_mobile/MobileScreens.jsx":"7e5740692374"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MySystemLifeDesignSystem_265e57 = window.MySystemLifeDesignSystem_265e57 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
const RING = {
  online: 'var(--green-500)',
  away: 'var(--orange-500)',
  offline: 'var(--ink-600)'
};
function Avatar({
  name = '',
  src,
  size = 36,
  status,
  ring,
  style
}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      flex: '0 0 auto',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      background: src ? 'var(--surface-raised)' : `linear-gradient(140deg, oklch(0.42 0.13 ${hue}), oklch(0.28 0.09 ${hue + 24}))`,
      color: 'var(--ink-100)',
      font: `var(--fw-medium) ${Math.max(10, Math.round(size * 0.36))}px/1 var(--font-core)`,
      boxShadow: ring ? `0 0 0 2px var(--surface-app), 0 0 0 3.5px ${RING[ring] || ring}` : undefined
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials), status && /*#__PURE__*/React.createElement("span", {
    "aria-label": status,
    style: {
      position: 'absolute',
      right: -1,
      bottom: -1,
      width: Math.max(8, size * 0.28),
      height: Math.max(8, size * 0.28),
      borderRadius: '50%',
      background: RING[status] || status,
      border: '2px solid var(--surface-app)'
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const TONES = {
  ontime: {
    fg: 'var(--status-ontime-fg)',
    bg: 'var(--status-ontime-bg)',
    bd: 'var(--status-ontime-bd)'
  },
  delay: {
    fg: 'var(--status-delay-fg)',
    bg: 'var(--status-delay-bg)',
    bd: 'var(--status-delay-bd)'
  },
  delivered: {
    fg: 'var(--status-delivered-fg)',
    bg: 'var(--status-delivered-bg)',
    bd: 'var(--status-delivered-bd)'
  },
  danger: {
    fg: 'var(--status-danger-fg)',
    bg: 'var(--status-danger-bg)',
    bd: 'var(--status-danger-bd)'
  },
  neutral: {
    fg: 'var(--text-muted)',
    bg: 'var(--surface-raised)',
    bd: 'var(--border-default)'
  },
  solid: {
    fg: 'var(--white)',
    bg: 'var(--red-500)',
    bd: 'transparent'
  }
};
function Badge({
  children,
  tone = 'neutral',
  dot = true,
  style
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 22,
      padding: '0 9px',
      borderRadius: 'var(--r-pill)',
      background: t.bg,
      border: `1px solid ${t.bd}`,
      color: t.fg,
      font: `var(--fw-medium) var(--fs-xs)/1 var(--font-core)`,
      whiteSpace: 'nowrap',
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: 'currentColor',
      flex: '0 0 auto'
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
/* Lucide is the closest CDN match to the source kit's thin, rounded outline glyphs.
   Load it once per page: <script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.js"></script> */
function Icon({
  name,
  size = 18,
  strokeWidth = 1.6,
  color = 'currentColor',
  style,
  className
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const draw = () => {
      const lib = window.lucide;
      if (!lib || !ref.current) return false;
      const key = name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
      const node = lib.icons && (lib.icons[key] || lib.icons[name]) || null;
      if (!node) return false;
      ref.current.innerHTML = '';
      ref.current.appendChild(lib.createElement(node));
      const svg = ref.current.firstChild;
      if (svg) {
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('stroke-width', strokeWidth);
        svg.setAttribute('stroke', color);
        svg.style.display = 'block';
      }
      return true;
    };
    if (!draw()) {
      const t = setInterval(() => {
        if (draw()) clearInterval(t);
      }, 60);
      return () => clearInterval(t);
    }
  }, [name, size, strokeWidth, color]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    className: className,
    "aria-hidden": "true",
    style: {
      display: 'inline-flex',
      width: size,
      height: size,
      flex: '0 0 auto',
      ...style
    }
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const SIZES = {
  sm: {
    h: 'var(--control-h-sm)',
    px: 12,
    fs: 'var(--fs-body)',
    icon: 14,
    gap: 6
  },
  md: {
    h: 'var(--control-h)',
    px: 16,
    fs: 'var(--fs-sm)',
    icon: 16,
    gap: 8
  },
  lg: {
    h: 'var(--control-h-lg)',
    px: 22,
    fs: 'var(--fs-md)',
    icon: 18,
    gap: 10
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  disabled,
  fullWidth,
  onClick,
  type = 'button',
  style
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const skin = {
    primary: {
      background: hover ? 'var(--gradient-primary-hover)' : 'var(--gradient-primary)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent',
      boxShadow: hover ? 'var(--glow-accent)' : 'var(--inset-top-sheen)'
    },
    secondary: {
      background: hover ? 'var(--surface-raised)' : 'var(--surface-card)',
      color: 'var(--text-body)',
      border: '1px solid var(--border-default)'
    },
    outline: {
      background: hover ? 'var(--accent-soft)' : 'transparent',
      color: 'var(--purple-300)',
      border: '1px solid var(--border-accent)'
    },
    ghost: {
      background: hover ? 'var(--surface-hover)' : 'transparent',
      color: 'var(--text-muted)',
      border: '1px solid transparent'
    },
    danger: {
      background: hover ? 'var(--red-600)' : 'var(--red-500)',
      color: 'var(--white)',
      border: '1px solid transparent'
    }
  }[variant] || {};
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.h,
      padding: `0 ${s.px}px`,
      width: fullWidth ? '100%' : undefined,
      font: `var(--fw-medium) ${s.fs}/1 var(--font-core)`,
      borderRadius: 'var(--r-control)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.42 : 1,
      transform: press && !disabled ? 'scale(var(--press-scale))' : 'none',
      transition: 'var(--t-hover), transform var(--dur-fast) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)',
      whiteSpace: 'nowrap',
      ...skin,
      ...style
    }
  }, iconLeft && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: s.icon
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function Card({
  title,
  subtitle,
  action,
  children,
  padding,
  glow,
  flush,
  style,
  bodyStyle,
  onMenuClick
}) {
  const pad = padding ?? 'var(--card-pad-lg)';
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-card)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      ...style
    }
  }, glow && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--gradient-kpi-glow)',
      pointerEvents: 'none'
    }
  }), (title || action) && /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-6)',
      padding: `${pad} ${pad} ${subtitle ? 'var(--sp-4)' : 'var(--sp-6)'}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--text-heading)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-4)',
      flex: '0 0 auto'
    }
  }, action, onMenuClick && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Card menu",
    onClick: onMenuClick,
    style: {
      background: 'none',
      border: 0,
      padding: 4,
      cursor: 'pointer',
      color: 'var(--text-muted)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "more-vertical",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      padding: flush ? 0 : title ? `0 ${pad} ${pad}` : pad,
      ...bodyStyle
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function IconButton({
  icon,
  size = 36,
  variant = 'secondary',
  label,
  active,
  disabled,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const skin = {
    secondary: {
      background: active ? 'var(--accent)' : hover ? 'var(--surface-raised)' : 'var(--surface-card)',
      border: `1px solid ${active ? 'transparent' : 'var(--border-default)'}`,
      color: active ? 'var(--white)' : 'var(--text-muted)'
    },
    ghost: {
      background: hover ? 'var(--surface-hover)' : 'transparent',
      border: '1px solid transparent',
      color: hover ? 'var(--text-body)' : 'var(--text-muted)'
    },
    accent: {
      background: 'var(--gradient-primary)',
      border: '1px solid transparent',
      color: 'var(--white)',
      boxShadow: hover ? 'var(--glow-accent)' : 'var(--inset-top-sheen)'
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      flex: '0 0 auto',
      borderRadius: 'var(--r-lg)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.42 : 1,
      transition: 'var(--t-hover)',
      ...skin,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: Math.round(size * 0.46)
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/ProgressBar.jsx
try { (() => {
const FILLS = {
  purple: 'var(--gradient-bar-purple)',
  green: 'var(--gradient-bar-green)',
  orange: 'var(--gradient-bar-orange)',
  neutral: 'var(--gradient-bar-neutral)',
  accent: 'var(--accent)'
};
function ProgressBar({
  value = 0,
  tone = 'purple',
  height = 8,
  label,
  valueLabel,
  style
}) {
  const pct = Math.max(0, Math.min(100, value));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      ...style
    }
  }, (label || valueLabel) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-4)',
      marginBottom: 6
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, label), valueLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      font: `var(--fw-medium) var(--fs-body)/1 var(--font-core)`,
      color: FILLS[tone] === FILLS.neutral ? 'var(--text-body)' : `var(--${tone === 'purple' ? 'purple-300' : tone === 'green' ? 'green-500' : tone === 'orange' ? 'orange-500' : 'ink-200'})`
    }
  }, valueLabel)), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-valuenow": pct,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    style: {
      height,
      borderRadius: 'var(--r-pill)',
      background: 'var(--surface-raised)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: `${pct}%`,
      height: '100%',
      borderRadius: 'var(--r-pill)',
      background: FILLS[tone] || FILLS.purple,
      transition: 'width var(--dur-slow) var(--ease-out)'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
const TONES = {
  order: {
    fg: 'var(--purple-200)',
    bg: 'rgba(104,46,199,.22)',
    chip: 'var(--purple-500)'
  },
  invoice: {
    fg: '#2B1B02',
    bg: 'var(--orange-500)',
    chip: 'rgba(0,0,0,.22)'
  },
  carrier: {
    fg: '#13300B',
    bg: 'var(--green-500)',
    chip: 'rgba(0,0,0,.18)'
  },
  driver: {
    fg: 'var(--green-500)',
    bg: 'rgba(125,226,96,.14)',
    chip: 'rgba(125,226,96,.28)'
  },
  role: {
    fg: 'var(--purple-300)',
    bg: 'rgba(104,46,199,.18)',
    chip: 'rgba(104,46,199,.4)'
  },
  neutral: {
    fg: 'var(--text-muted)',
    bg: 'var(--surface-raised)',
    chip: 'var(--ink-600)'
  }
};
function Tag({
  children,
  tone = 'neutral',
  count,
  style
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 22,
      padding: count == null ? '0 9px' : '0 4px 0 9px',
      borderRadius: 'var(--r-sm)',
      background: t.bg,
      color: t.fg,
      font: `var(--fw-medium) var(--fs-xs)/1 var(--font-core)`,
      whiteSpace: 'nowrap',
      ...style
    }
  }, children, count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 16,
      height: 16,
      padding: '0 4px',
      borderRadius: 'var(--r-xs)',
      background: t.chip,
      color: 'var(--white)',
      font: 'var(--type-badge)'
    }
  }, count));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/data/BarChart.jsx
try { (() => {
function BarChart({
  data = [],
  labels = [],
  height = 180,
  highlightIndex,
  valueLabel,
  style
}) {
  const max = Math.max(...data, 1);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 'var(--sp-4)',
      height,
      minWidth: 0
    }
  }, data.map((v, i) => {
    const on = i === highlightIndex;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        position: 'relative',
        flex: 1,
        minWidth: 0,
        height: '100%',
        display: 'flex',
        alignItems: 'flex-end'
      }
    }, on && valueLabel && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: `calc(${v / max * 100}% + 8px)`,
        padding: '4px 8px',
        borderRadius: 'var(--r-sm)',
        background: 'var(--purple-500)',
        color: 'var(--white)',
        font: `var(--fw-medium) var(--fs-micro)/1 var(--font-core)`,
        whiteSpace: 'nowrap'
      }
    }, valueLabel), /*#__PURE__*/React.createElement("span", {
      style: {
        width: '100%',
        height: `${v / max * 100}%`,
        borderRadius: 'var(--r-sm)',
        background: on ? 'var(--gradient-bar-purple)' : 'var(--ink-700)',
        transition: 'height var(--dur-slow) var(--ease-out)'
      }
    }));
  })), labels.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-4)',
      marginTop: 'var(--sp-5)'
    }
  }, labels.map((l, i) => /*#__PURE__*/React.createElement("span", {
    key: l + i,
    style: {
      flex: 1,
      minWidth: 0,
      textAlign: 'center',
      font: 'var(--type-body)',
      color: i === highlightIndex ? 'var(--purple-300)' : 'var(--text-muted)'
    }
  }, l))));
}
Object.assign(__ds_scope, { BarChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/BarChart.jsx", error: String((e && e.message) || e) }); }

// components/data/CarrierRow.jsx
try { (() => {
function CarrierRow({
  rank,
  name,
  location,
  rating,
  reviews,
  vehicles,
  partners,
  onMenuClick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '28px minmax(0,2fr) 90px minmax(0,1fr) minmax(0,1fr) 40px',
      alignItems: 'center',
      gap: 'var(--sp-6)',
      minHeight: 'var(--row-h)',
      padding: 'var(--sp-5) var(--sp-8)',
      borderTop: '1px solid var(--border-hairline)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-subtle)'
    }
  }, String(rank).padStart(2, '0')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-5)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    size: 32
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: `var(--fw-medium) var(--fs-body)/1.3 var(--font-core)`,
      color: 'var(--text-body)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: `var(--fw-regular) var(--fs-xs)/1.3 var(--font-core)`,
      color: 'var(--text-muted)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, location))), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: `var(--fw-medium) var(--fs-sm)/1.3 var(--font-core)`,
      color: 'var(--text-body)'
    }
  }, rating), reviews != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: `var(--fw-regular) var(--fs-micro)/1.3 var(--font-core)`,
      color: 'var(--text-muted)'
    }
  }, reviews, " Reviews")), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "truck",
    size: 15
  }), vehicles, " Vehicles"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "users",
    size: 15
  }), partners, " partners"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Carrier actions",
    onClick: onMenuClick,
    style: {
      justifySelf: 'end',
      background: 'none',
      border: 0,
      padding: 4,
      cursor: 'pointer',
      color: 'var(--text-muted)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "more-vertical",
    size: 16
  })));
}
Object.assign(__ds_scope, { CarrierRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/CarrierRow.jsx", error: String((e && e.message) || e) }); }

// components/data/DonutChart.jsx
try { (() => {
function DonutChart({
  segments = [],
  size = 180,
  thickness = 26,
  gap = 3,
  centerValue,
  centerLabel,
  style
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      flex: '0 0 auto',
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`,
    style: {
      transform: 'rotate(-90deg)'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "var(--surface-raised)",
    strokeWidth: thickness
  }), segments.map((s, i) => {
    const len = s.value / total * c;
    const dash = Math.max(0, len - gap);
    const el = /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: size / 2,
      cy: size / 2,
      r: r,
      fill: "none",
      stroke: s.color,
      strokeWidth: thickness,
      strokeLinecap: "butt",
      strokeDasharray: `${dash} ${c - dash}`,
      strokeDashoffset: -offset
    });
    offset += len;
    return el;
  })), (centerValue || centerLabel) && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2
    }
  }, centerValue && /*#__PURE__*/React.createElement("strong", {
    style: {
      font: 'var(--type-metric-lg)',
      color: 'var(--text-heading)'
    }
  }, centerValue), centerLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, centerLabel)));
}
Object.assign(__ds_scope, { DonutChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DonutChart.jsx", error: String((e && e.message) || e) }); }

// components/data/LineChart.jsx
try { (() => {
function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i],
      [x1, y1] = pts[i + 1];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}
function LineChart({
  series = [],
  labels = [],
  yTicks = [],
  height = 240,
  highlightIndex,
  tooltip,
  style
}) {
  const W = 1000,
    H = height,
    padL = 62,
    padB = 28,
    padT = 16,
    padR = 8;
  const n = Math.max(...series.map(s => s.data.length), 1);
  const all = series.flatMap(s => s.data);
  const max = Math.max(...all, 1),
    min = Math.min(...all, 0);
  const x = i => padL + i / Math.max(n - 1, 1) * (W - padL - padR);
  const y = v => padT + (1 - (v - min) / (max - min || 1)) * (H - padT - padB);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: "none",
    style: {
      width: '100%',
      height,
      display: 'block',
      overflow: 'visible'
    }
  }, yTicks.map((t, i) => {
    const gy = padT + i / Math.max(yTicks.length - 1, 1) * (H - padT - padB);
    return /*#__PURE__*/React.createElement("g", {
      key: t
    }, /*#__PURE__*/React.createElement("line", {
      x1: padL,
      x2: W - padR,
      y1: gy,
      y2: gy,
      stroke: "var(--chart-grid)",
      strokeDasharray: "3 6"
    }), /*#__PURE__*/React.createElement("text", {
      x: padL - 12,
      y: gy + 4,
      textAnchor: "end",
      fill: "var(--chart-axis)",
      style: {
        font: '400 13px var(--font-core)'
      }
    }, t));
  }), highlightIndex != null && /*#__PURE__*/React.createElement("rect", {
    x: x(highlightIndex) - 22,
    y: padT,
    width: 44,
    height: H - padT - padB,
    fill: "rgba(104,46,199,.20)",
    rx: "6"
  }), series.map((s, si) => /*#__PURE__*/React.createElement("path", {
    key: si,
    d: smooth(s.data.map((v, i) => [x(i), y(v)])),
    fill: "none",
    stroke: s.color || (si === 0 ? 'var(--chart-1)' : 'var(--chart-5)'),
    strokeWidth: s.width || 2.5,
    strokeLinecap: "round"
  })), highlightIndex != null && series[0] && /*#__PURE__*/React.createElement("circle", {
    cx: x(highlightIndex),
    cy: y(series[0].data[highlightIndex]),
    r: "7",
    fill: "var(--white)",
    stroke: "var(--purple-500)",
    strokeWidth: "3"
  }), labels.map((l, i) => /*#__PURE__*/React.createElement("text", {
    key: l + i,
    x: x(i),
    y: H - 6,
    textAnchor: "middle",
    fill: i === highlightIndex ? 'var(--purple-300)' : 'var(--chart-axis)',
    style: {
      font: '400 13px var(--font-core)'
    }
  }, l))), tooltip && highlightIndex != null && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: `${(padL + highlightIndex / Math.max(n - 1, 1) * (W - padL - padR)) / W * 100}%`,
      top: `${(y(series[0].data[highlightIndex]) - 46) / H * 100}%`,
      transform: 'translateX(-50%)',
      padding: '6px 10px',
      borderRadius: 'var(--r-md)',
      background: 'var(--purple-500)',
      color: 'var(--white)',
      font: `var(--fw-medium) var(--fs-body)/1 var(--font-core)`,
      whiteSpace: 'nowrap',
      boxShadow: 'var(--glow-accent)',
      pointerEvents: 'none'
    }
  }, tooltip));
}
Object.assign(__ds_scope, { LineChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/LineChart.jsx", error: String((e && e.message) || e) }); }

// components/data/MetricBarList.jsx
try { (() => {
function MetricBarList({
  items = [],
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-6)',
      minWidth: 0,
      ...style
    }
  }, items.map(it => /*#__PURE__*/React.createElement(__ds_scope.ProgressBar, {
    key: it.label,
    label: it.label,
    value: it.value,
    valueLabel: it.valueLabel ?? `${it.value}%`,
    tone: it.tone || 'neutral'
  })));
}
Object.assign(__ds_scope, { MetricBarList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MetricBarList.jsx", error: String((e && e.message) || e) }); }

// components/data/SelectionToolbar.jsx
try { (() => {
function SelectionToolbar({
  count = 0,
  actions,
  trailing,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-8)',
      flexWrap: 'wrap',
      minHeight: 'var(--control-h)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      font: `var(--fw-medium) var(--fs-lg)/1 var(--font-core)`,
      color: 'var(--text-heading)'
    }
  }, count, " Item selected"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-5)',
      flexWrap: 'wrap'
    }
  }, actions), trailing && /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto'
    }
  }, trailing));
}
Object.assign(__ds_scope, { SelectionToolbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SelectionToolbar.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
function StatCard({
  icon,
  value,
  label,
  delta,
  deltaTone = 'delivered',
  glow,
  style
}) {
  const tone = {
    delivered: 'var(--green-500)',
    delay: 'var(--orange-500)',
    danger: 'var(--red-500)'
  }[deltaTone] || 'var(--text-muted)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-9)',
      minWidth: 0,
      padding: 'var(--card-pad-lg)',
      overflow: 'hidden',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-card)',
      boxShadow: 'var(--shadow-card)',
      ...style
    }
  }, glow && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--gradient-kpi-glow)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 38,
      height: 38,
      borderRadius: '50%',
      flex: '0 0 auto',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 19
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--sp-5)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      font: 'var(--type-metric)',
      color: 'var(--text-heading)',
      letterSpacing: 'var(--ls-tight)'
    }
  }, value), delta && /*#__PURE__*/React.createElement("span", {
    style: {
      font: `var(--fw-medium) var(--fs-body)/1 var(--font-core)`,
      color: tone
    }
  }, delta)), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, label)));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
function Modal({
  open,
  onClose,
  width = 520,
  children,
  header,
  footer,
  align = 'left',
  style
}) {
  React.useEffect(() => {
    if (!open) return;
    const esc = e => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--sp-9)',
      background: 'var(--surface-scrim)',
      backdropFilter: 'var(--blur-scrim)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'relative',
      width: '100%',
      maxWidth: width,
      maxHeight: '90vh',
      overflowY: 'auto',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--r-modal)',
      boxShadow: 'var(--shadow-modal)',
      textAlign: align,
      ...style
    }
  }, onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Close",
    onClick: onClose,
    style: {
      position: 'absolute',
      top: 14,
      right: 14,
      background: 'none',
      border: 0,
      padding: 4,
      cursor: 'pointer',
      color: 'var(--text-muted)',
      display: 'flex',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 17
  })), header && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--sp-12) var(--sp-12) var(--sp-9)',
      borderBottom: '1px solid var(--border-hairline)'
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--sp-12)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-6)',
      padding: '0 var(--sp-12) var(--sp-12)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/OptionCard.jsx
try { (() => {
function OptionCard({
  icon,
  title,
  description,
  selected,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  const on = selected || hover;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-8)',
      width: '100%',
      padding: 'var(--sp-8)',
      cursor: 'pointer',
      textAlign: 'left',
      background: selected ? 'var(--accent-soft)' : 'var(--surface-raised)',
      border: `1px solid ${on ? 'var(--border-accent)' : 'var(--border-hairline)'}`,
      borderRadius: 'var(--r-xl)',
      transition: 'var(--t-hover)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 48,
      height: 48,
      flex: '0 0 auto',
      borderRadius: '50%',
      border: '1px solid var(--border-accent)',
      color: 'var(--purple-300)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 22
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: `var(--fw-medium) var(--fs-lg)/1.3 var(--font-core)`,
      color: 'var(--text-heading)'
    }
  }, title), description && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      marginTop: 4,
      lineHeight: 'var(--lh-normal)'
    }
  }, description)));
}
Object.assign(__ds_scope, { OptionCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/OptionCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/PromoBanner.jsx
try { (() => {
function PromoBanner({
  title,
  body,
  actionLabel,
  onAction,
  image,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      minHeight: 160,
      padding: 'var(--sp-10) var(--sp-12)',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-panel)',
      ...style
    }
  }, image && /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      position: 'absolute',
      right: 0,
      top: 0,
      height: '100%',
      width: '62%',
      objectFit: 'cover',
      objectPosition: 'right center',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: `var(--fw-medium) var(--fs-heading)/1.3 var(--font-core)`,
      color: 'var(--text-heading)'
    }
  }, title), body && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      marginTop: 'var(--sp-5)',
      lineHeight: 'var(--lh-normal)'
    }
  }, body), actionLabel && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "md",
    onClick: onAction,
    style: {
      marginTop: 'var(--sp-8)'
    }
  }, actionLabel)));
}
Object.assign(__ds_scope, { PromoBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/PromoBanner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/PromoCard.jsx
try { (() => {
function PromoCard({
  image,
  title = 'Go Premium!',
  body,
  actionLabel = 'Upgrade Now',
  onAction,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--sp-6)',
      padding: 'var(--sp-9) var(--sp-8)',
      textAlign: 'center',
      background: 'var(--gradient-promo)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-panel)',
      ...style
    }
  }, image && /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: '70%',
      maxWidth: 120,
      display: 'block'
    }
  }), /*#__PURE__*/React.createElement("h4", {
    style: {
      font: `var(--fw-medium) var(--fs-lg)/1.2 var(--font-core)`,
      color: 'var(--text-heading)'
    }
  }, title), body && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      lineHeight: 'var(--lh-normal)'
    }
  }, body), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    onClick: onAction,
    style: {
      marginTop: 'var(--sp-2)'
    }
  }, actionLabel));
}
Object.assign(__ds_scope, { PromoCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/PromoCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StepProgress.jsx
try { (() => {
function StepProgress({
  step = 1,
  total = 1,
  title,
  subtitle,
  style
}) {
  const pct = Math.max(0, Math.min(100, step / total * 100));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-9)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10,
      borderRadius: 'var(--r-pill)',
      background: 'var(--surface-raised)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: `${pct}%`,
      height: '100%',
      borderRadius: 'var(--r-pill)',
      background: 'var(--gradient-bar-purple)',
      boxShadow: 'var(--glow-accent-strong)',
      transition: 'width var(--dur-slow) var(--ease-out)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--sp-9)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("h2", {
    style: {
      font: `var(--fw-semibold) var(--fs-heading)/1.25 var(--font-core)`,
      color: 'var(--text-heading)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-page-subtitle)',
      color: 'var(--text-muted)',
      marginTop: 6
    }
  }, subtitle)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: `var(--fw-medium) var(--fs-subheading)/1 var(--font-core)`,
      color: 'var(--text-heading)',
      flex: '0 0 auto'
    }
  }, step, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-subtle)'
    }
  }, "/", total))));
}
Object.assign(__ds_scope, { StepProgress });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StepProgress.jsx", error: String((e && e.message) || e) }); }

// components/feedback/SuccessDialog.jsx
try { (() => {
function SuccessDialog({
  open,
  onClose,
  title,
  message,
  actionLabel = 'Thank you!',
  onAction,
  tone = 'success'
}) {
  const color = tone === 'danger' ? 'var(--red-500)' : 'var(--purple-500)';
  const glow = tone === 'danger' ? 'var(--glow-danger)' : 'var(--glow-accent-strong)';
  return /*#__PURE__*/React.createElement(__ds_scope.Modal, {
    open: open,
    onClose: onClose,
    width: 380,
    align: "center"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--sp-6)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: color,
      color: 'var(--white)',
      boxShadow: glow
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: tone === 'danger' ? 'alert-triangle' : 'check',
    size: 26,
    strokeWidth: 2.2
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: `var(--fw-semibold) var(--fs-subheading)/1.25 var(--font-core)`,
      color: 'var(--text-heading)'
    }
  }, title), message && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      maxWidth: 280
    }
  }, message), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "outline",
    size: "sm",
    onClick: onAction || onClose,
    style: {
      marginTop: 'var(--sp-2)'
    }
  }, actionLabel)));
}
Object.assign(__ds_scope, { SuccessDialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/SuccessDialog.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
  disabled,
  style
}) {
  const on = checked || indeterminate;
  const box = /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 18,
      height: 18,
      flex: '0 0 auto',
      borderRadius: 'var(--r-xs)',
      background: on ? 'var(--accent-soft-hover)' : 'transparent',
      border: `1px solid ${on ? 'var(--purple-400)' : 'var(--border-strong)'}`,
      color: 'var(--purple-300)',
      transition: 'var(--t-hover)'
    }
  }, indeterminate ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "minus",
    size: 12
  }) : checked ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12
  }) : null);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--sp-4)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.42 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked),
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), box, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-body)'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
function DataTable({
  columns = [],
  rows = [],
  selectable,
  selected = [],
  onSelectedChange,
  rowKey = r => r.id,
  onRowClick,
  emptyMessage = 'Nothing here yet',
  style
}) {
  const [sort, setSort] = React.useState(null);
  const sel = new Set(selected);
  const allOn = rows.length > 0 && rows.every(r => sel.has(rowKey(r)));
  const someOn = rows.some(r => sel.has(rowKey(r)));
  const toggle = (k, on) => {
    const next = new Set(sel);
    on ? next.add(k) : next.delete(k);
    onSelectedChange && onSelectedChange([...next]);
  };
  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.key);
    if (!col) return rows;
    const get = r => col.sortValue ? col.sortValue(r) : r[col.key];
    return [...rows].sort((a, b) => {
      const x = get(a),
        y = get(b);
      const c = x == null ? -1 : y == null ? 1 : x > y ? 1 : x < y ? -1 : 0;
      return sort.dir === 'desc' ? -c : c;
    });
  }, [rows, sort, columns]);
  const grid = (selectable ? '40px ' : '') + columns.map(c => c.width || 'minmax(0,1fr)').join(' ');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: grid,
      alignItems: 'center',
      gap: 'var(--sp-6)',
      minHeight: 44,
      padding: '0 var(--sp-8)',
      background: 'var(--surface-raised)'
    }
  }, selectable && /*#__PURE__*/React.createElement(__ds_scope.Checkbox, {
    checked: allOn,
    indeterminate: !allOn && someOn,
    onChange: on => onSelectedChange && onSelectedChange(on ? rows.map(rowKey) : [])
  }), columns.map(c => /*#__PURE__*/React.createElement("button", {
    key: c.key,
    type: "button",
    disabled: !c.sortable,
    onClick: () => setSort(s => s && s.key === c.key ? s.dir === 'asc' ? {
      key: c.key,
      dir: 'desc'
    } : null : {
      key: c.key,
      dir: 'asc'
    }),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      minWidth: 0,
      padding: 0,
      border: 0,
      background: 'none',
      textAlign: c.align === 'right' ? 'right' : 'left',
      justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
      cursor: c.sortable ? 'pointer' : 'default',
      font: 'var(--type-body)',
      color: sort && sort.key === c.key ? 'var(--text-body)' : 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, c.header), c.sortable && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-up-down",
    size: 12
  })))), sorted.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      padding: 'var(--sp-14) var(--sp-8)',
      textAlign: 'center',
      font: 'var(--type-body)',
      color: 'var(--text-subtle)'
    }
  }, emptyMessage) : sorted.map(r => {
    const k = rowKey(r),
      on = sel.has(k);
    return /*#__PURE__*/React.createElement("div", {
      key: k,
      onClick: () => onRowClick && onRowClick(r),
      style: {
        display: 'grid',
        gridTemplateColumns: grid,
        alignItems: 'center',
        gap: 'var(--sp-6)',
        minHeight: 'var(--row-h)',
        padding: 'var(--sp-5) var(--sp-8)',
        borderTop: '1px solid var(--border-hairline)',
        background: on ? 'var(--surface-active)' : 'transparent',
        cursor: onRowClick ? 'pointer' : 'default',
        transition: 'var(--t-hover)'
      }
    }, selectable && /*#__PURE__*/React.createElement(__ds_scope.Checkbox, {
      checked: on,
      onChange: v => toggle(k, v)
    }), columns.map(c => /*#__PURE__*/React.createElement("div", {
      key: c.key,
      style: {
        minWidth: 0,
        font: 'var(--type-body)',
        color: 'var(--text-body)',
        textAlign: c.align === 'right' ? 'right' : 'left',
        display: 'flex',
        justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
        alignItems: 'center'
      }
    }, c.render ? c.render(r) : r[c.key])));
  }));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function Radio({
  options = [],
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-9)',
      flexWrap: 'wrap',
      ...style
    }
  }, options.map(o => {
    const on = o.value === value;
    return /*#__PURE__*/React.createElement("label", {
      key: o.value,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      checked: on,
      onChange: () => onChange && onChange(o.value),
      style: {
        position: 'absolute',
        opacity: 0,
        width: 0,
        height: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        flex: '0 0 auto',
        borderRadius: '50%',
        border: `1.5px solid ${on ? 'var(--purple-400)' : 'var(--ink-500)'}`,
        transition: 'var(--t-hover)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: on ? 'var(--purple-400)' : 'var(--ink-500)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--type-body)',
        color: on ? 'var(--text-body)' : 'var(--text-muted)'
      }
    }, o.label));
  }));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchInput.jsx
try { (() => {
function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  shortcut,
  size = 'md',
  fullWidth,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'lg' ? 'var(--control-h-lg)' : size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-4)',
      height: h,
      padding: '0 8px 0 12px',
      width: fullWidth ? '100%' : undefined,
      minWidth: 0,
      background: 'var(--surface-input)',
      borderRadius: 'var(--r-control)',
      border: `1px solid ${focus ? 'var(--border-focus)' : 'var(--border-default)'}`,
      transition: 'var(--t-hover)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 15,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    placeholder: placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      background: 'none',
      border: 0,
      outline: 'none',
      font: 'var(--type-body)',
      color: 'var(--text-body)'
    }
  }), shortcut && /*#__PURE__*/React.createElement("kbd", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 22,
      height: 22,
      padding: '0 6px',
      borderRadius: 'var(--r-xs)',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      color: 'var(--text-muted)',
      font: `var(--fw-medium) var(--fs-micro)/1 var(--font-core)`
    }
  }, shortcut));
}
Object.assign(__ds_scope, { SearchInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select',
  size = 'md',
  fullWidth,
  style
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const away = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);
  const current = options.find(o => o.value === value);
  const h = size === 'sm' ? 'var(--control-h-sm)' : size === 'lg' ? 'var(--control-h-lg)' : 'var(--control-h)';
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: 'relative',
      width: fullWidth ? '100%' : undefined,
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setOpen(o => !o),
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-5)',
      height: h,
      padding: '0 12px',
      width: '100%',
      cursor: 'pointer',
      background: 'var(--surface-card)',
      border: `1px solid ${open ? 'var(--border-focus)' : 'var(--border-default)'}`,
      borderRadius: 'var(--r-control)',
      font: 'var(--type-body)',
      color: current ? 'var(--text-body)' : 'var(--text-muted)',
      transition: 'var(--t-hover)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, current ? current.label : placeholder), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 15,
    color: "var(--text-muted)",
    style: {
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'var(--t-transform)'
    }
  })), open && /*#__PURE__*/React.createElement("ul", {
    style: {
      position: 'absolute',
      top: 'calc(100% + 6px)',
      left: 0,
      minWidth: '100%',
      zIndex: 40,
      margin: 0,
      padding: 6,
      listStyle: 'none',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-pop)'
    }
  }, options.map(o => /*#__PURE__*/React.createElement("li", {
    key: o.value
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      onChange && onChange(o.value);
      setOpen(false);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-5)',
      width: '100%',
      height: 32,
      padding: '0 10px',
      cursor: 'pointer',
      textAlign: 'left',
      background: o.value === value ? 'var(--accent-soft)' : 'transparent',
      border: 0,
      borderRadius: 'var(--r-sm)',
      font: 'var(--type-body)',
      color: o.value === value ? 'var(--purple-200)' : 'var(--text-body)'
    }
  }, o.label, o.value === value && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 13
  }))))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked,
  onChange,
  label,
  disabled,
  size = 'md',
  style
}) {
  const w = size === 'sm' ? 32 : 40,
    h = size === 'sm' ? 18 : 22,
    k = h - 6;
  const track = /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-block',
      width: w,
      height: h,
      flex: '0 0 auto',
      borderRadius: 'var(--r-pill)',
      background: checked ? 'var(--gradient-bar-purple)' : 'var(--ink-600)',
      transition: 'background var(--dur-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      left: checked ? w - k - 3 : 3,
      width: k,
      height: k,
      borderRadius: '50%',
      background: checked ? 'var(--white)' : 'var(--ink-300)',
      transition: 'left var(--dur-base) var(--ease-out)',
      boxShadow: '0 1px 2px rgba(0,0,0,.4)'
    }
  }));
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--sp-5)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.42 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    role: "switch",
    checked: !!checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked),
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), track, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-body)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/messaging/ChatListItem.jsx
try { (() => {
function ChatListItem({
  name,
  preview,
  time,
  role,
  unread,
  active,
  typing,
  avatar,
  onClick,
  style
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-6)',
      width: '100%',
      padding: 'var(--sp-6) var(--sp-8)',
      cursor: 'pointer',
      textAlign: 'left',
      border: 0,
      borderBottom: '1px solid var(--border-hairline)',
      background: active ? 'var(--surface-active)' : hover ? 'var(--surface-hover)' : 'transparent',
      transition: 'var(--t-hover)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    src: avatar,
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-4)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: `var(--fw-medium) var(--fs-sm)/1.3 var(--font-core)`,
      color: 'var(--text-body)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, name), role && /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    tone: role.toLowerCase() === 'driver' ? 'driver' : 'role'
  }, role)), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: typing ? 'var(--purple-300)' : 'var(--text-muted)',
      marginTop: 2,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, typing ? 'Typing…' : preview)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 5,
      flex: '0 0 auto'
    }
  }, time && /*#__PURE__*/React.createElement("span", {
    style: {
      font: `var(--fw-regular) var(--fs-xs)/1 var(--font-core)`,
      color: 'var(--text-muted)'
    }
  }, time), unread ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: '50%',
      background: 'var(--red-500)',
      color: 'var(--white)',
      font: 'var(--type-badge)'
    }
  }, unread) : null));
}
Object.assign(__ds_scope, { ChatListItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/messaging/ChatListItem.jsx", error: String((e && e.message) || e) }); }

// components/messaging/MessageBubble.jsx
try { (() => {
function MessageBubble({
  own,
  author,
  time,
  read,
  avatar,
  children,
  quote,
  attachment,
  style
}) {
  const bg = own ? 'var(--purple-500)' : 'var(--surface-raised)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: own ? 'flex-end' : 'flex-start',
      gap: 'var(--sp-4)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: own ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 'var(--sp-5)'
    }
  }, avatar !== false && /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: author || (own ? 'You' : ''),
    src: typeof avatar === 'string' ? avatar : undefined,
    size: 28
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: `var(--fw-medium) var(--fs-body)/1 var(--font-core)`,
      color: 'var(--text-body)'
    }
  }, own ? 'You' : author), time && /*#__PURE__*/React.createElement("span", {
    style: {
      font: `var(--fw-regular) var(--fs-xs)/1 var(--font-core)`,
      color: 'var(--text-muted)'
    }
  }, time), own && read && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check-check",
    size: 14,
    color: "var(--purple-300)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: own ? 'flex-end' : 'flex-start',
      gap: 'var(--sp-4)',
      maxWidth: 'min(520px, 82%)'
    }
  }, quote && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--sp-6) var(--sp-8)',
      borderRadius: 'var(--r-lg)',
      background: bg,
      borderLeft: '3px solid rgba(255,255,255,.55)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: `var(--fw-medium) var(--fs-body)/1.4 var(--font-core)`,
      color: 'var(--white)'
    }
  }, quote.author), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--type-body)',
      color: 'rgba(255,255,255,.88)'
    }
  }, quote.text)), children && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--sp-6) var(--sp-8)',
      borderRadius: 'var(--r-lg)',
      background: bg,
      font: 'var(--type-body)',
      color: own ? 'var(--white)' : 'var(--text-body)',
      lineHeight: 'var(--lh-normal)'
    }
  }, children), attachment && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-6)',
      minWidth: 260,
      padding: 'var(--sp-6) var(--sp-8)',
      borderRadius: 'var(--r-lg)',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 34,
      height: 34,
      borderRadius: 'var(--r-md)',
      background: 'var(--surface-card)',
      color: 'var(--text-muted)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "file-text",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: `var(--fw-medium) var(--fs-body)/1.3 var(--font-core)`,
      color: 'var(--text-body)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, attachment.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: `var(--fw-regular) var(--fs-xs)/1.3 var(--font-core)`,
      color: 'var(--text-muted)'
    }
  }, attachment.kind)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 30,
      height: 30,
      borderRadius: '50%',
      border: '1px solid var(--border-accent)',
      color: 'var(--purple-300)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "arrow-down",
    size: 15
  })))));
}
Object.assign(__ds_scope, { MessageBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/messaging/MessageBubble.jsx", error: String((e && e.message) || e) }); }

// components/messaging/MessageComposer.jsx
try { (() => {
function MessageComposer({
  value,
  onChange,
  onSend,
  placeholder = 'Your message..',
  tools = ['mic', 'map-pin', 'paperclip', 'smile'],
  style
}) {
  const send = () => {
    if (value && value.trim() && onSend) onSend(value.trim());
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-6)',
      padding: 'var(--sp-5) var(--sp-5) var(--sp-5) var(--sp-8)',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-lg)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    placeholder: placeholder,
    onKeyDown: e => {
      if (e.key === 'Enter') send();
    },
    style: {
      flex: 1,
      minWidth: 0,
      background: 'none',
      border: 0,
      outline: 'none',
      font: 'var(--type-body)',
      color: 'var(--text-body)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-3)',
      flex: '0 0 auto'
    }
  }, tools.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    type: "button",
    "aria-label": t,
    style: {
      background: 'none',
      border: 0,
      padding: 4,
      cursor: 'pointer',
      color: 'var(--text-muted)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t,
    size: 16
  }))), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "send",
    label: "Send message",
    variant: "accent",
    size: 34,
    onClick: send
  })));
}
Object.assign(__ds_scope, { MessageComposer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/messaging/MessageComposer.jsx", error: String((e && e.message) || e) }); }

// components/navigation/PageHeader.jsx
try { (() => {
function PageHeader({
  title,
  subtitle,
  actions,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 'var(--sp-9)',
      flexWrap: 'wrap',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-page-title)',
      color: 'var(--text-heading)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-page-subtitle)',
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, subtitle)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-5)'
    }
  }, actions));
}
Object.assign(__ds_scope, { PageHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/PageHeader.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Pagination.jsx
try { (() => {
function pages(total, current) {
  if (total <= 7) return Array.from({
    length: total
  }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '…', total - 2, total - 1, total];
  if (current >= total - 2) return [1, 2, 3, '…', total - 2, total - 1, total];
  return [1, '…', current, '…', total];
}
function Pagination({
  page = 1,
  total = 1,
  onChange,
  style
}) {
  const pad = n => String(n).padStart(2, '0');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-6)',
      flexWrap: 'wrap',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: "arrow-left",
    disabled: page <= 1,
    onClick: () => onChange && onChange(page - 1)
  }, "Previous"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-2)'
    }
  }, pages(total, page).map((p, i) => p === '…' ? /*#__PURE__*/React.createElement("span", {
    key: 'e' + i,
    style: {
      width: 28,
      textAlign: 'center',
      font: 'var(--type-body)',
      color: 'var(--text-subtle)'
    }
  }, "\u2026") : /*#__PURE__*/React.createElement("button", {
    key: p,
    type: "button",
    onClick: () => onChange && onChange(p),
    style: {
      minWidth: 30,
      height: 30,
      padding: '0 6px',
      cursor: 'pointer',
      border: 0,
      borderRadius: 'var(--r-sm)',
      background: p === page ? 'var(--gradient-primary)' : 'transparent',
      color: p === page ? 'var(--white)' : 'var(--text-muted)',
      font: `var(--fw-medium) var(--fs-body)/1 var(--font-core)`,
      transition: 'var(--t-hover)'
    }
  }, pad(p)))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    size: "sm",
    iconRight: "arrow-right",
    disabled: page >= total,
    onClick: () => onChange && onChange(page + 1)
  }, "Next"));
}
Object.assign(__ds_scope, { Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Sidebar.jsx
try { (() => {
function NavItem({
  item,
  active,
  onSelect
}) {
  const [hover, setHover] = React.useState(false);
  const on = active === item.id;
  return /*#__PURE__*/React.createElement("li", {
    style: {
      position: 'relative'
    }
  }, on && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: -20,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 'var(--bw-tab)',
      height: 22,
      borderRadius: '0 var(--r-pill) var(--r-pill) 0',
      background: 'var(--purple-400)',
      boxShadow: 'var(--glow-accent-strong)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => onSelect && onSelect(item.id),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-5)',
      width: '100%',
      height: 40,
      padding: '0 12px',
      cursor: 'pointer',
      textAlign: 'left',
      background: on ? 'var(--gradient-nav-active)' : hover ? 'var(--surface-hover)' : 'transparent',
      border: `1px solid ${on ? 'rgba(224,225,238,.10)' : 'transparent'}`,
      borderRadius: 'var(--r-nav)',
      font: 'var(--type-nav)',
      color: on ? 'var(--white)' : hover ? 'var(--text-body)' : 'var(--text-muted)',
      boxShadow: on ? 'var(--inset-top-sheen)' : 'none',
      transition: 'var(--t-hover)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, item.label), item.badge != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 'var(--r-pill)',
      background: 'var(--red-500)',
      color: 'var(--white)',
      font: 'var(--type-badge)'
    }
  }, item.badge)));
}
function Sidebar({
  sections = [],
  active,
  onSelect,
  search = true,
  footer,
  width,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-9)',
      width: width || 'var(--sidebar-w)',
      flex: '0 0 auto',
      minHeight: 0,
      padding: 'var(--sp-9) var(--sp-9) var(--sp-9)',
      background: 'var(--surface-app)',
      borderRight: '1px solid var(--border-hairline)',
      overflowY: 'auto',
      overflowX: 'hidden',
      ...style
    }
  }, search && /*#__PURE__*/React.createElement(__ds_scope.SearchInput, {
    placeholder: "Search",
    shortcut: "F",
    fullWidth: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-9)',
      flex: '1 0 auto'
    }
  }, sections.map(sec => /*#__PURE__*/React.createElement("div", {
    key: sec.label || 'main'
  }, sec.label && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-eyebrow)',
      color: 'var(--text-subtle)',
      padding: '0 12px',
      marginBottom: 'var(--sp-4)'
    }
  }, sec.label), /*#__PURE__*/React.createElement("ul", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-1)',
      listStyle: 'none',
      margin: 0,
      padding: 0
    }
  }, sec.items.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.id,
    item: it,
    active: active,
    onSelect: onSelect
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 auto'
    }
  }, footer));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function Pill({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--sp-4)',
      height: 36,
      padding: '0 12px',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-lg)',
      ...style
    }
  }, children);
}
function TopBar({
  brand,
  title,
  subtitle,
  theme = 'dark',
  onThemeChange,
  credits,
  notifications,
  user,
  onUserClick,
  leading,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-9)',
      height: 'var(--topbar-h)',
      padding: '0 var(--shell-gutter)',
      flex: '0 0 auto',
      background: 'var(--surface-app)',
      borderBottom: '1px solid var(--border-hairline)',
      ...style
    }
  }, leading, brand && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 'calc(var(--sidebar-w) - var(--shell-gutter))',
      flex: '0 0 auto'
    }
  }, brand), (title || subtitle) && /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, title && /*#__PURE__*/React.createElement("h1", {
    style: {
      font: 'var(--type-page-title)',
      color: 'var(--text-heading)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-page-subtitle)',
      color: 'var(--text-muted)'
    }
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-5)',
      marginLeft: 'auto',
      flex: '0 0 auto'
    }
  }, onThemeChange && /*#__PURE__*/React.createElement(Pill, {
    style: {
      padding: 4,
      gap: 2
    }
  }, ['light', 'dark'].map(m => /*#__PURE__*/React.createElement("button", {
    key: m,
    type: "button",
    "aria-label": m + ' theme',
    onClick: () => onThemeChange(m),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: 'var(--r-md)',
      cursor: 'pointer',
      border: 0,
      background: theme === m ? 'var(--accent)' : 'transparent',
      color: theme === m ? 'var(--white)' : 'var(--text-muted)',
      transition: 'var(--t-hover)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: m === 'light' ? 'sun' : 'moon',
    size: 15
  })))), credits != null && /*#__PURE__*/React.createElement(Pill, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "zap",
    size: 15,
    color: "var(--green-500)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: `var(--fw-medium) var(--fs-sm)/1 var(--font-core)`,
      color: 'var(--text-body)'
    }
  }, credits)), notifications != null && /*#__PURE__*/React.createElement(Pill, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "bell",
    size: 15,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 7px',
      borderRadius: 'var(--r-sm)',
      background: 'var(--red-500)',
      color: 'var(--white)',
      font: `var(--fw-medium) var(--fs-micro)/1 var(--font-core)`
    }
  }, notifications, " New")), user && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onUserClick,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-5)',
      height: 44,
      padding: '0 8px 0 6px',
      cursor: 'pointer',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-lg)',
      transition: 'var(--t-hover)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: user.name,
    src: user.avatar,
    size: 32
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'left',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: `var(--fw-medium) var(--fs-sm)/1.2 var(--font-core)`,
      color: 'var(--text-body)'
    }
  }, user.name), user.role && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: `var(--fw-regular) var(--fs-xs)/1.2 var(--font-core)`,
      color: 'var(--text-muted)'
    }
  }, user.role)), user.rating != null && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 26,
      height: 26,
      borderRadius: '50%',
      background: 'var(--red-500)',
      color: 'var(--white)',
      font: `var(--fw-medium) var(--fs-micro)/1 var(--font-core)`
    }
  }, user.rating), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 15,
    color: "var(--text-muted)"
  }))));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_desktop/AnalyticsScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Card,
  Button,
  StatCard,
  PromoBanner,
  DonutChart,
  MetricBarList,
  LineChart,
  BarChart,
  Radio
} = window.MySystemLifeDesignSystem_265e57 || {};
function AnalyticsScreen({
  onViewPlans
}) {
  const D = window.MSL_DATA;
  const [series, setSeries] = React.useState('last');
  const shown = series === 'last' ? [{
    data: D.revenueCurrent
  }, {
    data: D.revenuePrevious,
    color: 'var(--chart-5)',
    width: 2
  }] : [{
    data: D.revenuePrevious,
    color: 'var(--chart-5)',
    width: 2
  }, {
    data: D.revenueCurrent
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement(PromoBanner, {
    image: "../../../assets/img/promo-logistics-collage.png",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Your Profile Is Currently On", /*#__PURE__*/React.createElement("br", null), "The Free Plan"),
    body: /*#__PURE__*/React.createElement(React.Fragment, null, "Get Acquire Ted With Easting Plans", /*#__PURE__*/React.createElement("br", null), "And Get More Now"),
    actionLabel: "View Plans",
    onAction: onViewPlans
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
      gap: 'var(--card-gap)'
    }
  }, D.kpis.map(k => /*#__PURE__*/React.createElement(StatCard, _extends({
    key: k.label
  }, k)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.75fr) minmax(0,1fr)',
      gap: 'var(--card-gap)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Monthly Revenue",
    onMenuClick: () => {}
  }, /*#__PURE__*/React.createElement(Radio, {
    style: {
      marginBottom: 'var(--sp-9)'
    },
    value: series,
    onChange: setSeries,
    options: [{
      value: 'last',
      label: 'Last Year'
    }, {
      value: 'prev',
      label: 'Previous Year'
    }]
  }), /*#__PURE__*/React.createElement(LineChart, {
    height: 260,
    highlightIndex: 4,
    tooltip: "$30,89 per munth",
    yTicks: ['$10,000', '$5000', '$2000', '$1000'],
    labels: D.monthLabels,
    series: shown
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Orders",
    onMenuClick: () => {}
  }, /*#__PURE__*/React.createElement(BarChart, {
    height: 190,
    highlightIndex: 5,
    valueLabel: "382",
    labels: D.monthLabels,
    data: D.orderBars
  }))), /*#__PURE__*/React.createElement(Card, {
    title: "Top Carriers",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      iconRight: "arrow-right"
    }, "See All")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--sp-10)'
    }
  }, /*#__PURE__*/React.createElement(DonutChart, {
    size: 170,
    thickness: 28,
    centerValue: "100%",
    centerLabel: "Total",
    segments: [{
      value: 57,
      color: 'var(--chart-1)'
    }, {
      value: 18,
      color: 'var(--chart-2)'
    }, {
      value: 9,
      color: 'var(--chart-3)'
    }, {
      value: 7,
      color: 'var(--chart-4)'
    }, {
      value: 9,
      color: 'var(--chart-5)'
    }]
  }), /*#__PURE__*/React.createElement(MetricBarList, {
    style: {
      width: '100%'
    },
    items: D.fleet
  })))));
}
Object.assign(window, {
  AnalyticsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_desktop/AnalyticsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_desktop/AutomationsScreen.jsx
try { (() => {
const {
  Card,
  Button,
  Tag,
  Switch,
  IconButton,
  SearchInput,
  Select,
  DataTable,
  Pagination
} = window.MySystemLifeDesignSystem_265e57 || {};
function AutomationsScreen() {
  const D = window.MSL_DATA;
  const [q, setQ] = React.useState('');
  const [rows, setRows] = React.useState(D.automations);
  const [sel, setSel] = React.useState(['a3']);
  const [page, setPage] = React.useState(2);
  const [scope, setScope] = React.useState('all');
  const toggle = (id, on) => setRows(rs => rs.map(r => r.id === id ? {
    ...r,
    on
  } : r));
  const shown = rows.filter(r => q === '' || r.name.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-9)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 220,
      maxWidth: 380
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: q,
    onChange: setQ,
    placeholder: "Search\u2026",
    fullWidth: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 'var(--sp-5)'
    }
  }, /*#__PURE__*/React.createElement(Select, {
    value: scope,
    onChange: setScope,
    options: [{
      value: 'all',
      label: 'Execute New Automation'
    }, {
      value: 'order',
      label: 'Order automations'
    }, {
      value: 'carrier',
      label: 'Carrier automations'
    }]
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconRight: "plus"
  }, "Create New Automation")))), /*#__PURE__*/React.createElement(Card, {
    flush: true,
    bodyStyle: {
      padding: 'var(--card-pad-lg)'
    }
  }, /*#__PURE__*/React.createElement(DataTable, {
    selectable: true,
    selected: sel,
    onSelectedChange: setSel,
    rows: shown,
    columns: [{
      key: 'name',
      header: 'Automation Name',
      width: 'minmax(220px,2fr)',
      sortable: true
    }, {
      key: 'type',
      header: 'Operation Type',
      width: '150px',
      sortable: true,
      render: r => /*#__PURE__*/React.createElement(Tag, {
        tone: r.type.toLowerCase(),
        count: r.count
      }, r.type)
    }, {
      key: 'created',
      header: 'Creation Date',
      width: '160px',
      sortable: true
    }, {
      key: 'status',
      header: 'Status',
      width: '90px',
      render: r => /*#__PURE__*/React.createElement(Switch, {
        checked: r.on,
        onChange: on => toggle(r.id, on)
      })
    }, {
      key: 'action',
      header: 'Action',
      width: '56px',
      align: 'right',
      render: () => /*#__PURE__*/React.createElement(IconButton, {
        icon: "more-vertical",
        label: "Automation actions",
        variant: "ghost",
        size: 28
      })
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--sp-9)'
    }
  }, /*#__PURE__*/React.createElement(Pagination, {
    page: page,
    total: 6,
    onChange: setPage
  }))));
}
Object.assign(window, {
  AutomationsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_desktop/AutomationsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_desktop/Brand.jsx
try { (() => {
const {
  useState
} = React;

/* No logo was supplied with the source material, so the brand appears as a wordmark. */
function Brand({
  compact
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      font: 'var(--fw-bold) ' + (compact ? '13px' : '15px') + '/1 var(--font-core)',
      color: 'var(--ink-100)',
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: '50%',
      flex: '0 0 auto',
      background: 'var(--purple-500)',
      boxShadow: 'var(--glow-accent-strong)'
    }
  }), "My System Life");
}
Object.assign(window, {
  Brand
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_desktop/Brand.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_desktop/MessagesScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Card,
  Avatar,
  Tag,
  IconButton,
  ChatListItem,
  MessageBubble,
  MessageComposer
} = window.MySystemLifeDesignSystem_265e57 || {};
function Eyebrow({
  icon,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: 'var(--sp-6) var(--sp-8)',
      font: 'var(--type-body)',
      color: 'var(--text-subtle)',
      borderBottom: '1px solid var(--border-hairline)'
    }
  }, children);
}
function MessagesScreen() {
  const D = window.MSL_DATA;
  const [activeId, setActiveId] = React.useState('c1');
  const [draft, setDraft] = React.useState('');
  const [thread, setThread] = React.useState(D.thread);
  const active = D.chats.find(c => c.id === activeId) || D.chats[0];
  const send = text => {
    setThread(t => [...t, {
      own: true,
      time: 'Now',
      read: false,
      text
    }]);
    setDraft('');
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '360px minmax(0,1fr)',
      gap: 'var(--card-gap)',
      alignItems: 'stretch',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(Card, {
    flush: true,
    style: {
      minHeight: 0
    },
    bodyStyle: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--card-pad-lg)',
      borderBottom: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-page-title)',
      color: 'var(--text-heading)'
    }
  }, "All Chat"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-4)'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "square-pen",
    label: "New chat",
    size: 34
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "search",
    label: "Search chats",
    size: 34
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "\u25CD Pinned Message"), D.chats.filter(c => c.pinned).map(c => /*#__PURE__*/React.createElement(ChatListItem, _extends({
    key: c.id
  }, c, {
    active: c.id === activeId,
    onClick: () => setActiveId(c.id)
  }))), /*#__PURE__*/React.createElement(Eyebrow, null, "\u25CD All Message"), D.chats.filter(c => !c.pinned).map(c => /*#__PURE__*/React.createElement(ChatListItem, _extends({
    key: c.id
  }, c, {
    active: c.id === activeId,
    onClick: () => setActiveId(c.id)
  }))))), /*#__PURE__*/React.createElement(Card, {
    flush: true,
    style: {
      minHeight: 0
    },
    bodyStyle: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-9)',
      padding: 'var(--sp-8) var(--card-pad-lg)',
      borderBottom: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-6)',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: active.name,
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-medium) var(--fs-lg)/1.2 var(--font-core)',
      color: 'var(--text-heading)'
    }
  }, active.name), /*#__PURE__*/React.createElement(Tag, {
    tone: active.role === 'Driver' ? 'driver' : 'role'
  }, active.role)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, "PSP Cargo Group"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-5)'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "phone",
    label: "Call",
    size: 38
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "video",
    label: "Video call",
    size: 38
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "message-circle",
    label: "Thread options",
    size: 38
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-9)',
      padding: 'var(--card-pad-lg)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'center',
      padding: '6px 16px',
      borderRadius: 'var(--r-pill)',
      background: 'var(--surface-raised)',
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, "Today, Dec 25"), thread.map((m, i) => /*#__PURE__*/React.createElement(MessageBubble, {
    key: i,
    own: m.own,
    author: m.author,
    time: m.time,
    read: m.read,
    quote: m.quote,
    attachment: m.attachment
  }, m.text))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--card-pad-lg)',
      borderTop: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(MessageComposer, {
    value: draft,
    onChange: setDraft,
    onSend: send
  }))));
}
Object.assign(window, {
  MessagesScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_desktop/MessagesScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_desktop/OrdersScreen.jsx
try { (() => {
const {
  Card,
  Button,
  Badge,
  IconButton,
  SearchInput,
  Select,
  SelectionToolbar,
  DataTable,
  Pagination
} = window.MySystemLifeDesignSystem_265e57 || {};
function OrdersScreen({
  onEdit
}) {
  const D = window.MSL_DATA;
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [sel, setSel] = React.useState(['44511828177', '4501829693', '4500221765']);
  const [page, setPage] = React.useState(2);
  const rows = D.orders.filter(o => (filter === 'all' || o.tone === filter) && (q === '' || o.id.includes(q) || o.to.toLowerCase().includes(q.toLowerCase())));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-9)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 220,
      maxWidth: 380
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: q,
    onChange: setQ,
    placeholder: "Search or type command",
    fullWidth: true
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconRight: "plus",
    style: {
      marginLeft: 'auto'
    }
  }, "Create New Order"))), /*#__PURE__*/React.createElement(Card, {
    flush: true,
    bodyStyle: {
      padding: 'var(--card-pad-lg)'
    }
  }, /*#__PURE__*/React.createElement(SelectionToolbar, {
    count: sel.length,
    style: {
      marginBottom: 'var(--sp-9)'
    },
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: () => setSel([])
    }, "Dismiss"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm"
    }, "Send Invoice"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm"
    }, "Report"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: onEdit
    }, "Edit")),
    trailing: /*#__PURE__*/React.createElement(Select, {
      value: filter,
      onChange: setFilter,
      options: [{
        value: 'all',
        label: 'All Orders'
      }, {
        value: 'delay',
        label: 'Delayed'
      }, {
        value: 'ontime',
        label: 'On Time'
      }, {
        value: 'delivered',
        label: 'Delivered'
      }]
    })
  }), /*#__PURE__*/React.createElement(DataTable, {
    selectable: true,
    selected: sel,
    onSelectedChange: setSel,
    rows: rows,
    columns: [{
      key: 'id',
      header: 'Order',
      width: 'minmax(110px,1.1fr)',
      sortable: true
    }, {
      key: 'dest',
      header: 'Destinations',
      width: 'minmax(190px,1.5fr)',
      sortable: true,
      sortValue: r => r.to,
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          font: 'var(--type-body)',
          lineHeight: 'var(--lh-snug)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-muted)'
        }
      }, "From: "), r.from, /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-muted)'
        }
      }, "To: "), r.to)
    }, {
      key: 'cargo',
      header: 'Cargo',
      width: 'minmax(150px,1.3fr)',
      sortable: true,
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          font: 'var(--type-body)',
          lineHeight: 'var(--lh-snug)'
        }
      }, r.cargo, /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-muted)'
        }
      }, r.weight))
    }, {
      key: 'price',
      header: 'Price',
      width: '92px',
      sortable: true
    }, {
      key: 'date',
      header: 'Delivery Date',
      width: '128px',
      sortable: true
    }, {
      key: 'status',
      header: 'Status',
      width: '116px',
      sortable: true,
      render: r => /*#__PURE__*/React.createElement(Badge, {
        tone: r.tone
      }, r.status)
    }, {
      key: 'action',
      header: 'Action',
      width: '56px',
      align: 'right',
      render: () => /*#__PURE__*/React.createElement(IconButton, {
        icon: "more-vertical",
        label: "Order actions",
        variant: "ghost",
        size: 28
      })
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--sp-9)'
    }
  }, /*#__PURE__*/React.createElement(Pagination, {
    page: page,
    total: 6,
    onChange: setPage
  }))));
}
Object.assign(window, {
  OrdersScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_desktop/OrdersScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_desktop/OverviewScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Card,
  Button,
  StatCard,
  CarrierRow,
  DonutChart,
  MetricBarList,
  LineChart,
  Pagination,
  IconButton
} = window.MySystemLifeDesignSystem_265e57 || {};
function CarrierHeader() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '28px minmax(0,2fr) 90px minmax(0,1fr) minmax(0,1fr) 40px',
      gap: 'var(--sp-6)',
      minHeight: 44,
      alignItems: 'center',
      padding: '0 var(--sp-8)',
      background: 'var(--surface-raised)',
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null, "Company"), /*#__PURE__*/React.createElement("span", null, "Reviews"), /*#__PURE__*/React.createElement("span", null, "Vehicles"), /*#__PURE__*/React.createElement("span", null, "Partners"), /*#__PURE__*/React.createElement("span", {
    style: {
      justifySelf: 'end'
    }
  }, "Action"));
}
function OverviewScreen() {
  const D = window.MSL_DATA;
  const [page, setPage] = React.useState(2);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
      gap: 'var(--card-gap)'
    }
  }, D.kpis.map(k => /*#__PURE__*/React.createElement(StatCard, _extends({
    key: k.label
  }, k)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.75fr) minmax(0,1fr)',
      gap: 'var(--card-gap)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    flush: true,
    title: "Top Carriers",
    bodyStyle: {
      paddingBottom: 'var(--card-pad-lg)'
    },
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      iconRight: "arrow-right"
    }, "See All")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      margin: '0 var(--card-pad-lg)'
    }
  }, /*#__PURE__*/React.createElement(CarrierHeader, null), D.carriers.map(c => /*#__PURE__*/React.createElement(CarrierRow, _extends({
    key: c.rank
  }, c)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--sp-9) var(--card-pad-lg) 0'
    }
  }, /*#__PURE__*/React.createElement(Pagination, {
    page: page,
    total: 6,
    onChange: setPage
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Top Carriers",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      iconRight: "arrow-right"
    }, "See All")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--sp-10)'
    }
  }, /*#__PURE__*/React.createElement(DonutChart, {
    size: 170,
    thickness: 28,
    centerValue: "100%",
    centerLabel: "Total",
    segments: [{
      value: 57,
      color: 'var(--chart-1)'
    }, {
      value: 18,
      color: 'var(--chart-2)'
    }, {
      value: 9,
      color: 'var(--chart-3)'
    }, {
      value: 7,
      color: 'var(--chart-4)'
    }, {
      value: 9,
      color: 'var(--chart-5)'
    }]
  }), /*#__PURE__*/React.createElement(MetricBarList, {
    style: {
      width: '100%'
    },
    items: D.fleet
  }))), /*#__PURE__*/React.createElement(Card, {
    title: "Average Revenue",
    onMenuClick: () => {}
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      display: 'block',
      font: 'var(--type-metric)',
      color: 'var(--text-heading)',
      marginBottom: 'var(--sp-6)'
    }
  }, "$1015,48"), /*#__PURE__*/React.createElement(LineChart, {
    height: 150,
    highlightIndex: 7,
    yTicks: [],
    labels: D.monthLabels,
    series: [{
      data: D.revenuePrevious,
      color: 'var(--chart-5)',
      width: 2
    }]
  })))));
}
Object.assign(window, {
  OverviewScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_desktop/OverviewScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_desktop/PlaceholderScreen.jsx
try { (() => {
const {
  Card
} = window.MySystemLifeDesignSystem_265e57 || {};

/* The source material covers five views. The remaining sidebar destinations
   are intentionally left blank rather than invented. */
function PlaceholderScreen({
  name
}) {
  return /*#__PURE__*/React.createElement(Card, {
    style: {
      minHeight: 320
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--sp-6)',
      height: 280,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--text-heading)'
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      maxWidth: 380,
      lineHeight: 'var(--lh-normal)'
    }
  }, "Not designed in the source material. Left blank on purpose \u2014 Overview, Orders, Automations, Analytics and Messages are the five views the kit covers.")));
}
Object.assign(window, {
  PlaceholderScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_desktop/PlaceholderScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_desktop/data.js
try { (() => {
window.MSL_DATA = function () {
  const city = ['Viborg, Denmark', 'Aarhus, Denmark', 'Gdansk, Poland', 'Hamburg, Germany', 'Rotterdam, Netherlands'];
  const to = ['Siedice, Poland', 'Lyon, France', 'Turin, Italy', 'Bilbao, Spain', 'Leeds, United Kingdom'];
  const cargo = ['Building Materials', 'Refrigerated Goods', 'Bulk Chemicals', 'Palletised Retail'];
  const statuses = [['Delay', 'delay'], ['On Time', 'ontime'], ['Delivered', 'delivered']];
  const orders = [['4511829208', 0, 0, 0, '$950', 'Jan 3, 2025', 0], ['44511828177', 0, 0, 1, '$1,150', 'Jan 5, 2025', 1], ['4511826012', 1, 2, 0, '$850', 'Dec 28, 2024', 0], ['4501829693', 2, 1, 0, '$3,450', 'Dec 25, 2024', 0], ['4511829298', 0, 0, 0, '$1,855', 'Dec 23, 2024', 1], ['4462948102', 3, 3, 2, '$985', 'Dec 20, 2024', 0], ['4500221765', 0, 0, 0, '$1,450', 'Dec 18, 2024', 2], ['4511829296', 4, 4, 3, '$1,985', 'Dec 22, 2024', 2], ['4461828091', 0, 0, 0, '$9,080', 'Dec 16, 2024', 2], ['4511829284', 1, 1, 1, '$850', 'Dec 12, 2024', 2], ['4431829881', 0, 0, 0, '$1,854', 'Dec 10, 2024', 2]].map(([id, fi, ti, ci, price, date, si]) => ({
    id,
    from: city[fi],
    to: to[ti],
    cargo: cargo[ci],
    weight: '51,360 kg. 4 ml',
    price,
    date,
    status: statuses[si][0],
    tone: statuses[si][1]
  }));
  const carriers = ['Arkas Logistics', 'Zim Integrated', 'HMM Shipping', 'MSC Cargo', 'CMA CGM Group', 'ONE Network', 'Maersk Line', 'Cosco Freight', 'Hapag Bridge'].map((name, i) => ({
    rank: i + 1,
    name,
    location: 'Belfast, United Kingdom',
    rating: [8.7, 8.1, 8.9, 8.7, 8.7, 8.6, 9.7, 8.7, 9.7][i],
    reviews: [116, 74, 77, 88, 90, 112, 64, 12, 18][i],
    vehicles: [21, 19, 24, 32, 21, 16, 8, 12, 18][i],
    partners: [12, 16, 34, 39, 24, 18, 12, 14, 32][i]
  }));
  const automations = [['Delivery Date Warning', 'Order', 17, 'October 25, 2024', true], ['Invoice Sending', 'Invoice', 8, 'October 31, 2024', true], ['Automatic Order Editing', 'Order', 4, 'February 11, 2024', true], ['Newsletters For High-Rated Carriers', 'Order', 11, 'October 24, 2024', true], ['New Delivery Date Warning', 'Order', 6, 'December 29, 2024', true], ['Newsletters For High-Rated Carriers', 'Carrier', 14, 'December 19, 2024', false], ['New Delivery Date Warning', 'Order', 19, 'March 13, 2024', true], ['Newsletters For High-Rated Carriers', 'Carrier', 28, 'May 6, 2024', true], ['Notifications For Delayed Orders', 'Order', 7, 'August 2, 2024', true], ['Carrier Rate', 'Order', 12, 'December 2, 2024', true], ['Automated Notifications', 'Carrier', 18, 'April 28, 2024', true]].map(([name, type, count, created, on], i) => ({
    id: 'a' + i,
    name,
    type,
    count,
    created,
    on
  }));
  const chats = [{
    id: 'c1',
    name: 'Harrold Tafoya',
    role: 'Carrier',
    typing: true,
    time: '05:11 PM',
    pinned: true
  }, {
    id: 'c2',
    name: 'Mate Bruney',
    role: 'Carrier',
    preview: 'Thank you. Glad to feel this …',
    time: '04:17 PM',
    unread: 4,
    pinned: true
  }, {
    id: 'c3',
    name: 'Shannon Kile',
    role: 'Driver',
    preview: 'Yes, thank you…',
    time: '16:01 PM',
    unread: 2,
    pinned: true
  }, {
    id: 'c4',
    name: 'Kynie Mccotter',
    role: 'Carrier',
    preview: 'Have you had a chance to check it out?',
    time: '03:29 PM',
    unread: 3
  }, {
    id: 'c5',
    name: 'Savina Navarrate',
    role: 'Carrier',
    preview: "I'm already at the warehouse and…",
    time: '02:11 PM',
    unread: 1
  }, {
    id: 'c6',
    name: 'Marcel Pasculli',
    role: 'Driver',
    preview: 'Could you send me an updated invoice?',
    time: 'Yesterday'
  }, {
    id: 'c7',
    name: 'Gilbertine Rivet',
    role: 'Driver',
    preview: 'Yes, I am. I will let you know…',
    time: 'Yesterday'
  }, {
    id: 'c8',
    name: 'Nisa Cordial',
    role: 'Driver',
    preview: 'Yes, thank you…',
    time: 'Yesterday'
  }, {
    id: 'c9',
    name: 'Rafi Rohamat',
    role: 'Carrier',
    preview: "I'm already at the warehouse and…",
    time: 'Dec 20, 2024'
  }, {
    id: 'c10',
    name: 'Wenston Covil',
    role: 'Driver',
    preview: 'Can I fill up here? Location',
    time: 'Dec 18, 2024'
  }, {
    id: 'c11',
    name: 'Albert Flores',
    role: 'Driver',
    preview: 'Yes, thank you…',
    time: 'Dec 12, 2024'
  }];
  const thread = [{
    own: true,
    time: '09:44 PM',
    read: true,
    text: 'Sounds perfect. I will drop a message to Nick regarding changes.'
  }, {
    own: true,
    quote: {
      author: 'Mate Bruney',
      text: 'Wa he insist on this date?'
    },
    text: "I'm afraid, yes, he wille"
  }, {
    own: false,
    author: 'Harrold Tafoya',
    time: '09:44 PM',
    text: 'Nick, payday is coming. Can you copy the invoice for our bookkeeping department?'
  }, {
    own: true,
    time: '10:50 PM',
    read: true,
    text: "I'm attaching the invoice for the last shipment. Please check it out and assure of correctness."
  }, {
    own: true,
    attachment: {
      name: "I'm Invoice Ceva Bahn 21032023",
      kind: 'PDF'
    }
  }, {
    own: false,
    author: 'Harrold Tafoya',
    time: '09:44 PM',
    text: 'Thank youl Glad to feel this deference'
  }];
  const revenueCurrent = [2400, 3450, 2900, 4300, 2050, 3900, 4650, 3400, 5250, 4050, 3350, 5650];
  const revenuePrevious = [3100, 2400, 3650, 2900, 4450, 3100, 2700, 4950, 3600, 4850, 3900, 4250];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const orderBars = [120, 185, 140, 265, 190, 382, 210, 170, 245, 200, 150, 235];
  const fleet = [{
    label: 'Trucks',
    value: 57,
    tone: 'purple'
  }, {
    label: 'Cargo Vans',
    value: 18,
    tone: 'green'
  }, {
    label: 'Trailers',
    value: 9,
    tone: 'orange'
  }, {
    label: 'Cargo planes',
    value: 7,
    tone: 'neutral'
  }, {
    label: 'Others Vehicles',
    value: 9,
    tone: 'neutral'
  }];
  const kpis = [{
    icon: 'wallet',
    value: '1174',
    label: 'Total amount of orders',
    glow: true
  }, {
    icon: 'banknote',
    value: '$8,126,420',
    label: 'Total money paid'
  }, {
    icon: 'truck',
    value: '29',
    label: 'Available courier'
  }, {
    icon: 'clock',
    value: '89,011',
    label: 'Hours on the road'
  }];
  const nav = [{
    label: 'Menu',
    items: [{
      id: 'overview',
      label: 'Overview',
      icon: 'layout-dashboard'
    }, {
      id: 'orders',
      label: 'Orders',
      icon: 'clipboard-list'
    }, {
      id: 'carriers',
      label: 'Carriers',
      icon: 'truck'
    }, {
      id: 'invoice',
      label: 'Invoice',
      icon: 'file-text'
    }, {
      id: 'automations',
      label: 'Automations',
      icon: 'audio-lines'
    }, {
      id: 'analytics',
      label: 'Analytics',
      icon: 'chart-no-axes-combined'
    }, {
      id: 'reporting',
      label: 'Reporting',
      icon: 'clipboard-check'
    }, {
      id: 'messages',
      label: 'Messages',
      icon: 'message-square'
    }]
  }, {
    label: 'Support',
    items: [{
      id: 'settings',
      label: 'Settings',
      icon: 'settings'
    }, {
      id: 'help',
      label: 'Help',
      icon: 'shield-question-mark'
    }]
  }];
  const titles = {
    overview: ['Overview', 'Meet your oun numbers regarding all operations'],
    orders: ['Orders', 'Database of wires tenders'],
    carriers: ['Carriers', 'Fleet partners and their capacity'],
    invoice: ['Invoice', 'Billing documents and payment status'],
    automations: ['Automations', 'Automated flows for effective actions'],
    analytics: ['Analytics', 'Data analytics and insights'],
    reporting: ['Reporting', 'Scheduled and ad-hoc reports'],
    messages: ['Messages', 'Chats between parties'],
    settings: ['Settings', 'Workspace and account preferences'],
    help: ['Help', 'Guides, shortcuts and support']
  };
  return {
    orders,
    carriers,
    automations,
    chats,
    thread,
    revenueCurrent,
    revenuePrevious,
    monthLabels,
    orderBars,
    fleet,
    kpis,
    nav,
    titles
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_desktop/data.js", error: String((e && e.message) || e) }); }

// ui_kits/admin_mobile/MobileChrome.jsx
try { (() => {
const {
  Icon,
  IconButton,
  Avatar,
  SearchInput
} = window.MySystemLifeDesignSystem_265e57 || {};
function StatusBar() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 44,
      padding: '0 26px',
      flex: '0 0 auto',
      font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
      color: 'var(--ink-100)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "signal",
    size: 15
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "wifi",
    size: 15
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "battery-full",
    size: 17
  })));
}
function MobileHeader({
  onMenu,
  notifications = 2,
  onProfile
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--sp-6)',
      padding: 'var(--sp-6) var(--sp-8)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Open menu",
    onClick: onMenu,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      marginLeft: -10,
      background: 'none',
      border: 0,
      cursor: 'pointer',
      color: 'var(--ink-100)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "menu",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-6)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      height: 36,
      padding: '0 8px 0 10px',
      borderRadius: 'var(--r-lg)',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 16,
    color: "var(--text-muted)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 7px',
      borderRadius: 'var(--r-sm)',
      background: 'var(--red-500)',
      color: 'var(--white)',
      font: 'var(--fw-medium) var(--fs-micro)/1 var(--font-core)'
    }
  }, notifications, " New")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onProfile,
    "aria-label": "Profile",
    style: {
      background: 'none',
      border: 0,
      padding: 0,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Ronald Richards",
    size: 38
  }))));
}
function MobileUtilityRow({
  query,
  onQuery,
  theme,
  onTheme,
  credits = 40
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-5)',
      padding: '0 var(--sp-8) var(--sp-6)',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: query,
    onChange: onQuery,
    placeholder: "Search",
    shortcut: "F",
    size: "lg",
    fullWidth: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      height: 44,
      padding: 4,
      flex: '0 0 auto',
      borderRadius: 'var(--r-lg)',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)'
    }
  }, ['light', 'dark'].map(m => /*#__PURE__*/React.createElement("button", {
    key: m,
    type: "button",
    "aria-label": m + ' theme',
    onClick: () => onTheme(m),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 34,
      height: 34,
      borderRadius: 'var(--r-md)',
      border: 0,
      cursor: 'pointer',
      background: theme === m ? 'var(--accent)' : 'transparent',
      color: theme === m ? 'var(--white)' : 'var(--text-muted)',
      transition: 'var(--t-hover)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m === 'light' ? 'sun' : 'moon',
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      height: 44,
      padding: '0 14px',
      flex: '0 0 auto',
      borderRadius: 'var(--r-lg)',
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-hairline)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "zap",
    size: 16,
    color: "var(--green-500)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
      color: 'var(--text-body)'
    }
  }, credits)));
}
function MobileDrawer({
  open,
  onClose,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": !open,
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 60,
      pointerEvents: open ? 'auto' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--surface-scrim)',
      opacity: open ? 1 : 0,
      transition: 'opacity var(--dur-base) var(--ease-standard)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 268,
      display: 'flex',
      background: 'var(--surface-app)',
      boxShadow: 'var(--shadow-modal)',
      transform: open ? 'none' : 'translateX(-100%)',
      transition: 'transform var(--dur-slow) var(--ease-out)'
    }
  }, children));
}
Object.assign(window, {
  StatusBar,
  MobileHeader,
  MobileUtilityRow,
  MobileDrawer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_mobile/MobileChrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin_mobile/MobileScreens.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  Card,
  Button,
  Badge,
  Tag,
  StatCard,
  PromoBanner,
  LineChart,
  BarChart,
  DonutChart,
  MetricBarList,
  DataTable,
  Radio,
  Avatar,
  ChatListItem,
  MessageBubble,
  MessageComposer,
  IconButton,
  Switch,
  CarrierRow,
  Pagination,
  SelectionToolbar,
  Select
} = window.MySystemLifeDesignSystem_265e57 || {};

/* KPI tiles become a swipeable rail on mobile — the pattern the source shows, with dots. */
function KpiRail({
  items
}) {
  const ref = React.useRef(null);
  const [idx, setIdx] = React.useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (el) setIdx(Math.round(el.scrollLeft / (el.clientWidth * 0.62)));
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    onScroll: onScroll,
    style: {
      display: 'flex',
      gap: 'var(--sp-6)',
      overflowX: 'auto',
      scrollSnapType: 'x mandatory',
      paddingBottom: 'var(--sp-5)',
      margin: '0 calc(-1 * var(--sp-8))',
      padding: '0 var(--sp-8) var(--sp-5)'
    }
  }, items.map(k => /*#__PURE__*/React.createElement("div", {
    key: k.label,
    style: {
      flex: '0 0 62%',
      scrollSnapAlign: 'start'
    }
  }, /*#__PURE__*/React.createElement(StatCard, k)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 5
    }
  }, items.map((k, i) => /*#__PURE__*/React.createElement("span", {
    key: k.label,
    style: {
      width: i === idx ? 18 : 6,
      height: 6,
      borderRadius: 'var(--r-pill)',
      background: i === idx ? 'var(--purple-500)' : 'var(--ink-700)',
      transition: 'width var(--dur-base) var(--ease-out)'
    }
  }))));
}
function MobileDashboard({
  onViewPlans
}) {
  const D = window.MSL_DATA;
  const [series, setSeries] = React.useState('last');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement(PromoBanner, {
    image: "../../../assets/img/promo-logistics-collage.png",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Your Profile Is Currently", /*#__PURE__*/React.createElement("br", null), "On The Free Plan"),
    body: "Get Acquire Ted With Easting Plans And Get More Now",
    actionLabel: "View Plans",
    onAction: onViewPlans,
    style: {
      padding: 'var(--sp-9)',
      minHeight: 150
    }
  }), /*#__PURE__*/React.createElement(KpiRail, {
    items: D.kpis
  }), /*#__PURE__*/React.createElement(Card, {
    title: "Monthly Revenue",
    onMenuClick: () => {},
    padding: "var(--sp-8)"
  }, /*#__PURE__*/React.createElement(Radio, {
    style: {
      marginBottom: 'var(--sp-8)'
    },
    value: series,
    onChange: setSeries,
    options: [{
      value: 'last',
      label: 'Last Year'
    }, {
      value: 'prev',
      label: 'Previous Year'
    }]
  }), /*#__PURE__*/React.createElement(LineChart, {
    height: 190,
    highlightIndex: 4,
    tooltip: "$30,89 per munth",
    yTicks: ['$10,000', '$5000', '$2000', '$1000'],
    labels: D.monthLabels,
    series: series === 'last' ? [{
      data: D.revenueCurrent
    }, {
      data: D.revenuePrevious,
      color: 'var(--chart-5)',
      width: 2
    }] : [{
      data: D.revenuePrevious,
      color: 'var(--chart-5)',
      width: 2
    }]
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Top Carriers",
    padding: "var(--sp-8)",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      iconRight: "arrow-right"
    }, "See All")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--sp-9)'
    }
  }, /*#__PURE__*/React.createElement(DonutChart, {
    size: 170,
    thickness: 28,
    centerValue: "100%",
    centerLabel: "Total",
    segments: [{
      value: 57,
      color: 'var(--chart-1)'
    }, {
      value: 18,
      color: 'var(--chart-2)'
    }, {
      value: 9,
      color: 'var(--chart-3)'
    }, {
      value: 7,
      color: 'var(--chart-4)'
    }, {
      value: 9,
      color: 'var(--chart-5)'
    }]
  }), /*#__PURE__*/React.createElement(MetricBarList, {
    style: {
      width: '100%'
    },
    items: D.fleet
  }))), /*#__PURE__*/React.createElement(Card, {
    title: "Orders",
    onMenuClick: () => {},
    padding: "var(--sp-8)"
  }, /*#__PURE__*/React.createElement(BarChart, {
    height: 150,
    highlightIndex: 5,
    valueLabel: "382",
    labels: D.monthLabels,
    data: D.orderBars
  })));
}

/* Rows become stacked cards rather than a side-scrolling table — nothing is dropped. */
function MobileOrders({
  onEdit
}) {
  const D = window.MSL_DATA;
  const [filter, setFilter] = React.useState('all');
  const [sel, setSel] = React.useState(['44511828177', '4501829693']);
  const [page, setPage] = React.useState(2);
  const rows = D.orders.filter(o => filter === 'all' || o.tone === filter);
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    iconRight: "plus"
  }, "Create New Order"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-6)'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
      color: 'var(--text-heading)'
    }
  }, sel.length, " Item selected"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      minWidth: 130
    }
  }, /*#__PURE__*/React.createElement(Select, {
    size: "md",
    value: filter,
    onChange: setFilter,
    fullWidth: true,
    options: [{
      value: 'all',
      label: 'All Orders'
    }, {
      value: 'delay',
      label: 'Delayed'
    }, {
      value: 'ontime',
      label: 'On Time'
    }, {
      value: 'delivered',
      label: 'Delivered'
    }]
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-5)',
      overflowX: 'auto',
      paddingBottom: 2
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: () => setSel([])
  }, "Dismiss"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Send Invoice"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "Report"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    onClick: onEdit
  }, "Edit")), rows.map(o => {
    const on = sel.includes(o.id);
    return /*#__PURE__*/React.createElement("div", {
      key: o.id,
      onClick: () => toggle(o.id),
      style: {
        padding: 'var(--sp-8)',
        background: on ? 'var(--surface-active)' : 'var(--surface-card)',
        border: '1px solid ' + (on ? 'var(--border-accent)' : 'var(--border-hairline)'),
        borderRadius: 'var(--r-card)',
        cursor: 'pointer',
        transition: 'var(--t-hover)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--sp-6)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--fw-medium) var(--fs-md)/1 var(--font-core)',
        color: 'var(--text-heading)'
      }
    }, o.id), /*#__PURE__*/React.createElement(Badge, {
      tone: o.tone
    }, o.status)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--sp-6)',
        marginTop: 'var(--sp-8)'
      }
    }, [['From', o.from], ['To', o.to], ['Cargo', o.cargo], ['Weight', o.weight], ['Price', o.price], ['Delivery Date', o.date]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        font: 'var(--fw-regular) var(--fs-xs)/1.3 var(--font-core)',
        color: 'var(--text-muted)'
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        font: 'var(--type-body)',
        color: 'var(--text-body)'
      }
    }, v)))));
  }), /*#__PURE__*/React.createElement(Pagination, {
    page: page,
    total: 6,
    onChange: setPage
  }));
}
function MobileAutomations() {
  const D = window.MSL_DATA;
  const [rows, setRows] = React.useState(D.automations);
  const toggle = (id, on) => setRows(rs => rs.map(r => r.id === id ? {
    ...r,
    on
  } : r));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--card-gap)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    iconRight: "plus"
  }, "Create New Automation"), rows.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-8)',
      padding: 'var(--sp-8)',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-card)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--fw-medium) var(--fs-sm)/1.35 var(--font-core)',
      color: 'var(--text-heading)'
    }
  }, r.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-5)',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(Tag, {
    tone: r.type.toLowerCase(),
    count: r.count
  }, r.type), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-regular) var(--fs-xs)/1 var(--font-core)',
      color: 'var(--text-muted)'
    }
  }, r.created))), /*#__PURE__*/React.createElement(Switch, {
    checked: r.on,
    onChange: on => toggle(r.id, on)
  }))));
}
function MobileCarriers() {
  const D = window.MSL_DATA;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--card-gap)'
    }
  }, D.carriers.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.rank,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-8)',
      padding: 'var(--sp-8)',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--r-card)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.name,
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--fw-medium) var(--fs-sm)/1.3 var(--font-core)',
      color: 'var(--text-heading)'
    }
  }, c.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--fw-regular) var(--fs-xs)/1.3 var(--font-core)',
      color: 'var(--text-muted)'
    }
  }, c.location), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      marginTop: 4
    }
  }, c.vehicles, " Vehicles \xB7 ", c.partners, " partners")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--fw-medium) var(--fs-lg)/1.2 var(--font-core)',
      color: 'var(--text-heading)'
    }
  }, c.rating), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: 'var(--fw-regular) var(--fs-micro)/1.2 var(--font-core)',
      color: 'var(--text-muted)'
    }
  }, c.reviews, " Reviews")))));
}
function MobileMessages() {
  const D = window.MSL_DATA;
  const [openId, setOpenId] = React.useState(null);
  const [draft, setDraft] = React.useState('');
  const [thread, setThread] = React.useState(D.thread);
  const active = D.chats.find(c => c.id === openId);
  if (!active) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        margin: 'calc(-1 * var(--sp-8))',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--r-card)',
        overflow: 'hidden',
        background: 'var(--surface-card)'
      }
    }, D.chats.map(c => /*#__PURE__*/React.createElement(ChatListItem, _extends({
      key: c.id
    }, c, {
      onClick: () => setOpenId(c.id)
    }))));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-9)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-6)'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-left",
    label: "Back to all chats",
    size: 44,
    variant: "ghost",
    onClick: () => setOpenId(null)
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: active.name,
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--fw-medium) var(--fs-md)/1.2 var(--font-core)',
      color: 'var(--text-heading)'
    }
  }, active.name), /*#__PURE__*/React.createElement(Tag, {
    tone: active.role === 'Driver' ? 'driver' : 'role'
  }, active.role)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, "PSP Cargo Group")), /*#__PURE__*/React.createElement(IconButton, {
    icon: "phone",
    label: "Call",
    size: 44
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'center',
      padding: '6px 16px',
      borderRadius: 'var(--r-pill)',
      background: 'var(--surface-raised)',
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, "Today, Dec 25"), thread.map((m, i) => /*#__PURE__*/React.createElement(MessageBubble, {
    key: i,
    own: m.own,
    author: m.author,
    time: m.time,
    read: m.read,
    quote: m.quote,
    attachment: m.attachment
  }, m.text)), /*#__PURE__*/React.createElement(MessageComposer, {
    value: draft,
    onChange: setDraft,
    tools: ['paperclip', 'smile'],
    onSend: t => {
      setThread(x => [...x, {
        own: true,
        time: 'Now',
        text: t
      }]);
      setDraft('');
    }
  }));
}
function MobilePlaceholder({
  name
}) {
  return /*#__PURE__*/React.createElement(Card, {
    padding: "var(--sp-9)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 'var(--sp-12) 0'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--text-heading)'
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      marginTop: 'var(--sp-5)',
      lineHeight: 'var(--lh-normal)'
    }
  }, "Not designed in the source material. Left blank on purpose.")));
}
Object.assign(window, {
  MobileDashboard,
  MobileOrders,
  MobileAutomations,
  MobileCarriers,
  MobileMessages,
  MobilePlaceholder,
  KpiRail
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin_mobile/MobileScreens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.BarChart = __ds_scope.BarChart;

__ds_ns.CarrierRow = __ds_scope.CarrierRow;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.DonutChart = __ds_scope.DonutChart;

__ds_ns.LineChart = __ds_scope.LineChart;

__ds_ns.MetricBarList = __ds_scope.MetricBarList;

__ds_ns.SelectionToolbar = __ds_scope.SelectionToolbar;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.OptionCard = __ds_scope.OptionCard;

__ds_ns.PromoBanner = __ds_scope.PromoBanner;

__ds_ns.PromoCard = __ds_scope.PromoCard;

__ds_ns.StepProgress = __ds_scope.StepProgress;

__ds_ns.SuccessDialog = __ds_scope.SuccessDialog;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.SearchInput = __ds_scope.SearchInput;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.ChatListItem = __ds_scope.ChatListItem;

__ds_ns.MessageBubble = __ds_scope.MessageBubble;

__ds_ns.MessageComposer = __ds_scope.MessageComposer;

__ds_ns.PageHeader = __ds_scope.PageHeader;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.TopBar = __ds_scope.TopBar;

})();
