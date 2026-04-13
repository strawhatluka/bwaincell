'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  const { username } = useAuthContext();

  return (
    <div className="max-w-4xl w-full mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-twilight-600 via-dusk-600 to-dawn-600 bg-clip-text text-transparent mb-2 break-words">
          Welcome back, {username || 'User'}!
        </h1>
      </div>

      <div className="bg-card rounded-lg p-4 sm:p-6 lg:p-8 border border-border">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">
          A letter to the woman whose very existence brings joy to my soul,
        </h2>
        <p className="text-foreground text-sm sm:text-base">
          Words cannot express the life, love, and joy you give to me.
        </p>
        <br />
        <p className="text-foreground text-sm sm:text-base">
          You are my biggest supporter and can bring calm to the tangled web of thoughts that
          scatter accross my brain. You are the fresh rain after a long drought, the shining light
          amidst a dark night, the extra chicky nugget in my happy meal.
        </p>
        <br />
        <p className="text-foreground text-sm sm:text-base">
          I love you more than I can put into words
        </p>
        <br />
        <p className="text-foreground text-sm sm:text-base">
          So to you, Princess, I give you our Bwaincell.
        </p>
        <br />
        <p className="text-foreground text-sm sm:text-base">I love you, always</p>
        <br />
        <p className="text-foreground text-sm sm:text-base">Your Onion Knight</p>
      </div>
    </div>
  );
}
