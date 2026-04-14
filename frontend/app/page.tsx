'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-purple-950 flex items-center justify-center">
      <div className="container mx-auto px-4 py-16 relative">
        {/* Header */}
        <div className="text-center mb-16 relative z-10">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-twilight-400 via-dusk-400 to-dawn-400 bg-clip-text text-transparent mb-4">
            Bwain.app
          </h1>
          <p className="text-xl text-purple-200 mb-8">Same Fweak, Same Bwaincell</p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-dawn-500 hover:bg-dawn-600 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Silhouettes */}
        <div className="flex items-end justify-center gap-8 max-w-4xl mx-auto">
          {/* Final Fantasy Onion Knight Silhouette */}
          <svg
            viewBox="0 0 200 400"
            className="w-64 h-96 fill-twilight-600 opacity-80"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Flowing feather/onion plumes sprouting upward */}
            <path d="M 85 20 Q 82 5 85 -10 Q 88 5 85 20" />
            <path d="M 95 15 Q 93 0 95 -15 Q 97 0 95 15" />
            <path d="M 100 10 Q 98 -8 100 -20 Q 102 -8 100 10" />
            <path d="M 105 15 Q 107 0 105 -15 Q 103 0 105 15" />
            <path d="M 115 20 Q 118 5 115 -10 Q 112 5 115 20" />

            {/* Large flowing plume/feathers curving outward */}
            <path d="M 75 25 Q 60 15 50 10 Q 60 20 75 30" />
            <path d="M 80 28 Q 68 20 60 18 Q 68 25 80 32" />
            <path d="M 125 25 Q 140 15 150 10 Q 140 20 125 30" />
            <path d="M 120 28 Q 132 20 140 18 Q 132 25 120 32" />

            {/* Round helmet base with decorative band */}
            <ellipse cx="100" cy="60" rx="42" ry="45" />
            <rect x="70" y="55" width="60" height="8" rx="2" opacity="0.3" />

            {/* Face guard/visor - chibi cute style */}
            <ellipse cx="100" cy="75" rx="18" ry="14" />

            {/* Cape/scarf flowing behind */}
            <path d="M 80 95 Q 45 120 35 180 Q 40 150 50 120 Q 60 100 80 100" opacity="0.6" />
            <path
              d="M 120 95 Q 155 120 165 180 Q 160 150 150 120 Q 140 100 120 100"
              opacity="0.6"
            />

            {/* Neck/collar */}
            <rect x="82" y="95" width="36" height="12" rx="4" />

            {/* Large ornate pauldrons with gems */}
            <ellipse cx="60" cy="125" rx="32" ry="28" />
            <ellipse cx="140" cy="125" rx="32" ry="28" />
            <circle cx="60" cy="125" r="10" opacity="0.4" />
            <circle cx="140" cy="125" r="10" opacity="0.4" />

            {/* Chibi compact body/armor */}
            <rect x="78" y="110" width="44" height="85" rx="8" />

            {/* Chest armor plate with gem */}
            <ellipse cx="100" cy="145" rx="20" ry="25" opacity="0.3" />
            <circle cx="100" cy="145" r="8" opacity="0.5" />

            {/* Belt with ornate buckle */}
            <rect x="78" y="190" width="44" height="8" />
            <circle cx="100" cy="194" r="6" />

            {/* Armored skirt/tassets */}
            <path d="M 80 198 L 75 215 L 85 215 L 83 198" />
            <path d="M 87 198 L 85 215 L 95 215 L 93 198" />
            <path d="M 107 198 L 105 215 L 115 215 L 113 198" />
            <path d="M 117 198 L 115 215 L 125 215 L 120 198" />

            {/* Short chibi arms */}
            <rect x="48" y="130" width="16" height="65" rx="8" />
            <rect x="136" y="130" width="16" height="65" rx="8" />

            {/* Ornate gauntlets */}
            <rect x="46" y="190" width="20" height="18" rx="4" />
            <rect x="134" y="190" width="20" height="18" rx="4" />

            {/* Decorated shield - red with white cross */}
            <ellipse cx="30" cy="165" rx="22" ry="30" />
            <circle cx="30" cy="165" r="16" opacity="0.3" />
            <rect x="28" y="155" width="4" height="20" opacity="0.5" />
            <rect x="20" y="163" width="20" height="4" opacity="0.5" />

            {/* Ornate sword with decorative hilt */}
            <rect x="168" y="145" width="7" height="65" rx="2" />
            <path d="M 171.5 140 L 166 148 L 177 148 Z" />
            <ellipse cx="171.5" cy="135" rx="4" ry="6" />
            <rect x="164" y="208" width="15" height="8" rx="2" />

            {/* Short chibi legs */}
            <rect x="84" y="215" width="14" height="95" rx="7" />
            <rect x="102" y="215" width="14" height="95" rx="7" />

            {/* Large ornate boots with curled toes */}
            <ellipse cx="91" cy="320" rx="16" ry="22" />
            <ellipse cx="109" cy="320" rx="16" ry="22" />
            <path d="M 85 330 Q 70 335 65 332" />
            <path d="M 115 330 Q 130 335 135 332" />

            {/* Boot armor plates */}
            <rect x="84" y="305" width="14" height="10" rx="2" opacity="0.4" />
            <rect x="102" y="305" width="14" height="10" rx="2" opacity="0.4" />
          </svg>

          {/* Lady Silhouette */}
          <svg
            viewBox="0 0 200 400"
            className="w-64 h-96 fill-twilight-600 opacity-80"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Head */}
            <ellipse cx="100" cy="50" rx="30" ry="35" />

            {/* Hair/Crown */}
            <path d="M 70 45 Q 100 20 130 45 Q 100 35 70 45 Z" />
            <ellipse cx="100" cy="40" rx="32" ry="25" />

            {/* Neck */}
            <rect x="90" y="80" width="20" height="20" rx="5" />

            {/* Shoulders */}
            <ellipse cx="70" cy="110" rx="25" ry="15" />
            <ellipse cx="130" cy="110" rx="25" ry="15" />

            {/* Upper torso */}
            <path d="M 75 100 L 75 180 Q 100 185 125 180 L 125 100 Z" />

            {/* Waist */}
            <ellipse cx="100" cy="180" rx="28" ry="12" />

            {/* Dress skirt */}
            <path d="M 72 180 L 50 360 L 150 360 L 128 180 Z" />

            {/* Dress details - flowing fabric */}
            <path
              d="M 80 200 Q 70 280 75 360"
              opacity="0.3"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M 100 200 Q 100 280 100 360"
              opacity="0.3"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M 120 200 Q 130 280 125 360"
              opacity="0.3"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />

            {/* Arms */}
            <path d="M 75 110 L 55 140 L 50 200 Q 45 210 50 220" />
            <path d="M 125 110 L 145 140 L 150 200 Q 155 210 150 220" />

            {/* Hands */}
            <ellipse cx="50" cy="225" rx="8" ry="12" />
            <ellipse cx="150" cy="225" rx="8" ry="12" />
          </svg>
        </div>

        {/* Footer with legal links */}
        <div className="mt-16 text-center text-sm text-purple-300">
          <p>
            <a href="/privacy" className="hover:text-purple-100 underline">
              Privacy Policy
            </a>
            {' · '}
            <a href="/terms" className="hover:text-purple-100 underline">
              Terms of Service
            </a>
          </p>
          <p className="mt-2 text-xs">© 2024 Bwain.app. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
