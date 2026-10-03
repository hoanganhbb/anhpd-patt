import { Box } from '@chakra-ui/react'

// Faded lighthouse-and-mountains illustration for the bottom of the sidebar.
export default function SidebarArt() {
  return (
    <Box
      aria-hidden
      color={{ _light: '#8fa39d', _dark: '#3d4a46' }}
      pointerEvents="none"
      css={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 45%)',
        // On short screens the navigation needs the room more than the decoration.
        '@media (max-height: 820px)': { display: 'none' }
      }}
    >
      <svg viewBox="0 0 248 220" width="100%" fill="currentColor" style={{ display: 'block' }}>
        {/* Far ridge */}
        <path
          opacity="0.18"
          d="M0 150 L28 128 L52 140 L86 104 L112 126 L140 98 L170 122 L196 108 L222 128 L248 116 V220 H0 Z"
        />
        {/* Light beams */}
        <path opacity="0.10" d="M150 62 L248 38 L248 70 Z" />
        <path opacity="0.08" d="M138 62 L40 34 L40 68 Z" />
        {/* Lighthouse */}
        <g opacity="0.42">
          <path d="M139 50 L149 50 L151 56 L137 56 Z" />
          <rect x="136" y="56" width="16" height="10" rx="1.5" />
          <path d="M134 66 H154 V70 H134 Z" />
          <path d="M137 70 H151 L156 150 H132 Z" />
          <path
            opacity="0.5"
            d="M136.2 84 H151.8 L152.6 96 H135.4 Z M134.9 108 H153.1 L153.9 120 H134.1 Z"
          />
          <path d="M141 136 h6 v14 h-6 z" opacity="0.6" />
        </g>
        {/* Mid hills */}
        <path
          opacity="0.24"
          d="M0 170 Q30 150 62 162 T124 152 Q150 146 176 156 T248 150 V220 H0 Z"
        />
        {/* Near hills */}
        <path opacity="0.30" d="M0 192 Q48 172 98 186 T190 180 Q222 176 248 186 V220 H0 Z" />
      </svg>
    </Box>
  )
}
