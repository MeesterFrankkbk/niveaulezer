import React from 'react';
import { Story, StudentResult } from '../types';
import { AVI_COLORS } from '../utils/aviCalculator';
import { Clock, BookOpen, CheckCircle, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';

interface StoryCardProps {
  story: Story;
  latestResult?: StudentResult;
  onSelectStory: (story: Story) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  latestResult,
  onSelectStory
}) => {
  const levelColor = AVI_COLORS[story.level] || AVI_COLORS['M4'];

  return (
    <div
      onClick={() => onSelectStory(story)}
      className="group bg-white rounded-3xl p-5 shadow-xs hover:shadow-xl border border-stone-200 hover:border-amber-400 transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden"
    >
      <div>
        {/* Story Illustration Preview */}
        {story.image && (
          <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 bg-stone-100 relative">
            <img
              src={story.image}
              alt={story.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {/* Level Badge Overlay */}
            <div className="absolute top-3 left-3">
              <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${levelColor.badge} shadow-md font-lexend`}>
                {story.level}
              </span>
            </div>

            {/* Read status indicator */}
            {latestResult && (
              <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-md flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{latestResult.score}%</span>
              </div>
            )}
          </div>
        )}

        {/* Code & Category */}
        <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-1.5">
          <span className="font-mono text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
            {story.code}
          </span>
          <span>{story.category}</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-stone-900 font-lexend group-hover:text-amber-700 transition-colors leading-snug mb-2">
          {story.title}
        </h3>

        {/* Excerpt */}
        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-4">
          {story.content}
        </p>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>~{story.readingTimeMinutes} min</span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
            <span>{story.wordCount} w</span>
          </div>
        </div>

        <div className="flex items-center gap-1 font-bold text-amber-600 group-hover:translate-x-1 transition-transform font-lexend">
          <span>Lees nu</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
