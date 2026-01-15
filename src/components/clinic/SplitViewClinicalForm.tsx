'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle, Bookmark, Sparkles, ShieldCheck, Eye, FileText, Users } from 'lucide-react';
import { submitClinicalReview } from '@/app/actions/submitClinicalReview';
import { generateAIDraft } from '@/app/actions/generateAIDraft';
import { detectDiscrepancies } from '@/lib/ai/discrepancyDetector';
import { DIAGNOSIS_TEMPLATES, getDiagnosisTemplate } from '@/lib/screening/diagnosisTemplates';
import { getReferralCenters, formatReferralRecommendation } from '@/lib/screening/referralCenters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoBookmark } from './VideoPlayer';
import { DiscrepancyAlert } from './DiscrepancyAlert';

interface SplitViewClinicalFormProps {
  screeningId: string;
  bookmarks?: VideoBookmark[];
  childName?: string;
  aiScores?: {
    social?: number | null;
    fineMotor?: number | null;
    language?: number | null;
    grossMotor?: number | null;
  };
  compact?: boolean;
}

type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export function SplitViewClinicalForm({ 
  screeningId, 
  bookmarks = [],
  childName = 'the child',
  aiScores,
  compact = false
}: SplitViewClinicalFormProps) {
  const router = useRouter();
  const [internalNotes, setInternalNotes] = useState('');
  const [parentRecs, setParentRecs] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Clinical domain scores (for discrepancy detection)
  const [clinicalScores, setClinicalScores] = useState({
    social: null as number | null,
    fineMotor: null as number | null,
    language: null as number | null,
    grossMotor: null as number | null,
  });

  const internalNotesRef = useRef<HTMLTextAreaElement>(null);
  const parentRecsRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expanding textarea functionality
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 120), 600);
    textarea.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    adjustTextareaHeight(internalNotesRef.current);
    adjustTextareaHeight(parentRecsRef.current);
  }, [internalNotes, parentRecs]);

  // Handle textarea input for real-time expansion
  const handleInternalNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalNotes(e.target.value);
    setTimeout(() => adjustTextareaHeight(e.target), 0);
  };

  const handleParentRecsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setParentRecs(e.target.value);
    setTimeout(() => adjustTextareaHeight(e.target), 0);
  };

  // Calculate discrepancies
  const discrepancies = aiScores ? detectDiscrepancies(
    {
      social: aiScores.social ?? null,
      fineMotor: aiScores.fineMotor ?? null,
      language: aiScores.language ?? null,
      grossMotor: aiScores.grossMotor ?? null,
    },
    clinicalScores
  ) : { discrepancies: [], highDiscrepancyCount: 0, moderateDiscrepancyCount: 0, hasHighDiscrepancy: false };

  // Function to insert bookmark into notes
  const insertBookmark = (bookmark: VideoBookmark, target: 'internal' | 'parent') => {
    const bookmarkText = `[${bookmark.timeString}] `;
    const textarea = target === 'internal' ? internalNotesRef.current : parentRecsRef.current;
    const currentText = target === 'internal' ? internalNotes : parentRecs;
    const setText = target === 'internal' ? setInternalNotes : setParentRecs;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = currentText.substring(0, start);
      const textAfter = currentText.substring(end);
      const newText = textBefore + bookmarkText + textAfter;
      setText(newText);
      
      // Set cursor position after inserted bookmark
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + bookmarkText.length, start + bookmarkText.length);
      }, 0);
    } else {
      // Fallback: append to end
      setText((prev) => prev + (prev ? '\n' : '') + bookmarkText);
    }
  };

  // Handle AI draft generation
  const handleAIDraft = async () => {
    if (!internalNotes.trim() || internalNotes.trim().length < 10) {
      toast.error('Please add at least 10 characters of internal clinical notes first. Switch to the "Internal Notes" tab to add your observations.');
      return;
    }

    setIsDrafting(true);
    try {
      const template = getDiagnosisTemplate(selectedDiagnosis);
      const result = await generateAIDraft({
        screeningId,
        childName,
        aiScores: {
          social: aiScores.social,
          fineMotor: aiScores.fineMotor,
          language: aiScores.language,
          grossMotor: aiScores.grossMotor,
        }
      });

      if (result.success && 'data' in result && result.data?.draft) {
        setParentRecs(result.data.draft);
        toast.success('Draft generated successfully! Please review and edit as needed.');
      } else {
        toast.error('Failed to generate draft');
      }
    } catch (error) {
      console.error('Error generating AI draft:', error);
      toast.error('An error occurred while generating the draft');
    } finally {
      setIsDrafting(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!riskLevel) {
      toast.error('Please select a risk level');
      return;
    }

    if (!internalNotes.trim()) {
      toast.error('Please provide internal clinical notes');
      return;
    }

    if (!parentRecs.trim()) {
      toast.error('Please provide parent recommendations');
      return;
    }

    setIsSubmitting(true);
    console.log('📝 [SplitView Form] Submitting clinical review:', { 
      screeningId, 
      riskLevel, 
      internalNotesLength: internalNotes.length,
      parentRecsLength: parentRecs.length 
    });

    try {
      const result = await submitClinicalReview(
        screeningId, 
        `${internalNotes}\n\nParent Recommendations:\n${parentRecs}`, // Combine notes
        riskLevel,
        clinicalScores.social !== null || clinicalScores.fineMotor !== null || 
        clinicalScores.language !== null || clinicalScores.grossMotor !== null ? {
          social_score_clinical: clinicalScores.social ?? undefined,
          fine_motor_clinical: clinicalScores.fineMotor ?? undefined,
          language_clinical: clinicalScores.language ?? undefined,
          gross_motor_clinical: clinicalScores.grossMotor ?? undefined,
        } : undefined,
        selectedDiagnosis ? getDiagnosisTemplate(selectedDiagnosis)?.name : undefined
      );

      if (result.success) {
        toast.success('Review submitted successfully');
        router.refresh();
      } else {
        console.error('📝 [SplitView Form] Server Action Failed:', result.error);
        toast.error(result.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('📝 [SplitView Form] Exception caught:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskLevelColor = (level: RiskLevel) => {
    switch (level) {
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getRiskLevelIcon = (level: RiskLevel) => {
    switch (level) {
      case 'LOW':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'MODERATE':
        return <AlertTriangle className="h-4 w-4" />;
      case 'HIGH':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`border-teal-200 shadow-sm ${compact ? 'border-transparent shadow-none' : ''}`}>
      {!compact && (
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base font-semibold text-teal-900">Clinical Assessment</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Provide assessment and finalize report
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-indigo-200">
              <ShieldCheck className="w-3 h-3 mr-1 text-indigo-500" />
              Verified
            </Badge>
          </div>
        </CardHeader>
      )}

      <CardContent className={compact ? 'pt-0' : 'pt-0'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Risk Level Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-teal-900">
              Risk Level <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MODERATE', 'HIGH'] as RiskLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskLevel(level)}
                  disabled={isSubmitting}
                  className={`
                    flex flex-col items-center justify-center gap-1.5 p-3 rounded-md border-2 transition-all text-xs
                    ${riskLevel === level
                      ? `${getRiskLevelColor(level)} border-current font-semibold`
                      : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {getRiskLevelIcon(level)}
                  <span>{level}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Discrepancy Warnings */}
          {discrepancies.discrepancies.length > 0 && (
            <DiscrepancyAlert discrepancies={discrepancies.discrepancies} />
          )}

          {/* Split View Tabs */}
          <Tabs defaultValue="internal" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-slate-100">
              <TabsTrigger 
                value="internal" 
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm rounded-md px-4 py-2.5 text-sm font-medium"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Internal Notes
              </TabsTrigger>
              <TabsTrigger 
                value="parent" 
                className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm rounded-md px-4 py-2.5 text-sm font-medium"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Parent Recs
              </TabsTrigger>
            </TabsList>

            {/* Internal Notes Tab */}
            <TabsContent value="internal" className="space-y-3 mt-3">
              {/* Evidence Bookmarks */}
              {bookmarks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      <Bookmark className="w-3 h-3" />
                      Bookmarks
                    </Label>
                    <span className="text-[10px] text-slate-400">Click to insert</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {bookmarks.map((bm, i) => (
                      <Button 
                        key={i} 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        onClick={() => insertBookmark(bm, 'internal')}
                        className="text-[10px] h-7 px-2 border-slate-200 hover:bg-slate-50"
                      >
                        <Bookmark className="w-2.5 h-2.5 mr-1" />
                        {bm.timeString}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Notes Textarea */}
              <div className="space-y-2">
                <Label htmlFor="internal-notes" className="text-sm font-semibold text-slate-700">
                  Clinical Notes <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="internal-notes"
                  ref={internalNotesRef}
                  value={internalNotes}
                  onChange={handleInternalNotesChange}
                  placeholder="Technical observations, medical terminology..."
                  className="min-h-[120px] max-h-[600px] text-sm border-slate-200 focus-visible:ring-slate-500 resize-none overflow-y-auto"
                  disabled={isSubmitting}
                  style={{ height: 'auto' }}
                />
                <p className="text-xs text-slate-500 flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Not shared with parents</span>
                </p>
              </div>
            </TabsContent>

            {/* Parent Recommendations Tab */}
            <TabsContent value="parent" className="space-y-3 mt-3">
              {/* Diagnosis Template Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Diagnosis Template <span className="text-xs font-normal text-slate-500">(Optional)</span>
                </Label>
                <select 
                  onChange={(e) => setSelectedDiagnosis(e.target.value)}
                  value={selectedDiagnosis}
                  disabled={isSubmitting}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-slate-200"
                >
                  <option value="">Select template...</option>
                  {DIAGNOSIS_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} - {t.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Referral Quick-Actions */}
              {selectedDiagnosis && getReferralCenters().length > 0 && (
                <div className="p-2 bg-blue-50 rounded border border-blue-100">
                  <p className="text-[10px] font-medium text-blue-700 mb-1.5">Quick Add Referrals:</p>
                  <div className="flex flex-wrap gap-1">
                    {getReferralCenters().map((center, i) => (
                      <Button 
                        key={i}
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="text-[10px] h-6 px-2 bg-white border-blue-200 hover:bg-blue-50"
                        onClick={() => {
                          const referralText = formatReferralRecommendation(center, 'Developmental assessment');
                          setParentRecs(prev => {
                            if (prev.includes(center.name)) {
                              toast.info('Already added');
                              return prev;
                            }
                            return prev + referralText;
                          });
                          toast.success(`Added ${center.name.split(' - ')[0]}`);
                        }}
                        disabled={isSubmitting}
                      >
                        + {center.name.split(' - ')[0]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations Header with AI Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="parent-recs" className="text-xs font-semibold text-slate-700">
                    Recommendations <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-1.5">
                    {(!internalNotes.trim() || internalNotes.trim().length < 10) && (
                      <span className="text-[10px] text-slate-500 italic">
                        Add internal notes first
                      </span>
                    )}
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      onClick={handleAIDraft}
                      disabled={isDrafting || !internalNotes.trim() || internalNotes.trim().length < 10}
                      className="text-[10px] h-7 px-2 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!internalNotes.trim() || internalNotes.trim().length < 10 
                        ? "Please add at least 10 characters of internal clinical notes first" 
                        : "Generate AI-powered parent recommendations from your clinical notes"}
                    >
                      {isDrafting ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Draft
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="parent-recs"
                  ref={parentRecsRef}
                  value={parentRecs}
                  onChange={handleParentRecsChange}
                  placeholder="Clear, simple recommendations for parents..."
                  className="min-h-[120px] max-h-[600px] text-sm border-indigo-200 focus-visible:ring-indigo-500 resize-none overflow-y-auto"
                  disabled={isSubmitting}
                  style={{ height: 'auto' }}
                />
                <p className="text-xs text-indigo-600 flex items-start gap-1.5">
                  <Users className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Visible to parents</span>
                </p>
              </div>

              {/* Parent View Preview */}
              {parentRecs.trim() && (
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-[10px] h-7 px-2 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                  {showPreview && (
                    <div className="mt-2 p-2 bg-indigo-50 rounded border border-indigo-200">
                      <p className="text-[10px] font-medium text-indigo-700 mb-1">Parent View:</p>
                      <div className="text-xs text-gray-700 whitespace-pre-wrap">
                        {parentRecs}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-200 mt-6">
            <Button
              type="submit"
              disabled={isSubmitting || !riskLevel || !internalNotes.trim() || !parentRecs.trim()}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm py-3"
              size="default"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Finalize Report'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

