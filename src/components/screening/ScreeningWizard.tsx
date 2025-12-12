'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useFamilyStore } from '@/store/useFamilyStore';
import { submitScreening } from '@/app/actions/submitScreening';
import { ClinicPaymentModal } from '@/components/dashboard/ClinicPaymentModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Users, Hand, MessageSquare, Activity, LucideIcon } from 'lucide-react';
import { getQuestionsByDomain } from '@/lib/services/questionService';
import { ScreeningDomain, QuestionsByDomain, DenverQuestion } from '@/types/screening';

type WizardStep = 'intro' | 'domains' | 'review' | 'analyzing' | 'results';

type AnswerValue = 'Yes' | 'Not Yet' | 'No';

// Domain order for sequential navigation
const DOMAIN_ORDER: ScreeningDomain[] = [
  ScreeningDomain.PERSONAL_SOCIAL,
  ScreeningDomain.FINE_MOTOR,
  ScreeningDomain.LANGUAGE,
  ScreeningDomain.GROSS_MOTOR,
];

// Domain labels for display
const DOMAIN_LABELS: Record<ScreeningDomain, string> = {
  [ScreeningDomain.PERSONAL_SOCIAL]: 'Personal-Social',
  [ScreeningDomain.FINE_MOTOR]: 'Fine Motor',
  [ScreeningDomain.LANGUAGE]: 'Language',
  [ScreeningDomain.GROSS_MOTOR]: 'Gross Motor',
};

// Domain icons mapping
const DOMAIN_ICONS: Record<ScreeningDomain, LucideIcon> = {
  [ScreeningDomain.PERSONAL_SOCIAL]: Users,
  [ScreeningDomain.FINE_MOTOR]: Hand,
  [ScreeningDomain.LANGUAGE]: MessageSquare,
  [ScreeningDomain.GROSS_MOTOR]: Activity,
};

// Domain colors for badges
const DOMAIN_COLORS: Record<ScreeningDomain, string> = {
  [ScreeningDomain.PERSONAL_SOCIAL]: 'bg-blue-100 text-blue-800',
  [ScreeningDomain.FINE_MOTOR]: 'bg-purple-100 text-purple-800',
  [ScreeningDomain.LANGUAGE]: 'bg-green-100 text-green-800',
  [ScreeningDomain.GROSS_MOTOR]: 'bg-orange-100 text-orange-800',
};

/**
 * Calculate age in months from birth date
 */
function calculateAgeInMonths(birthDate: Date): number {
  const today = new Date();
  const years = today.getFullYear() - birthDate.getFullYear();
  const months = today.getMonth() - birthDate.getMonth();
  return years * 12 + months;
}

/**
 * Get questions for a specific domain
 */
function getDomainQuestions(domain: ScreeningDomain, questions: QuestionsByDomain): DenverQuestion[] {
  return questions[domain] || [];
}

/**
 * Check if all questions in a domain are answered
 */
function isDomainComplete(domain: ScreeningDomain, questions: DenverQuestion[], answers: Record<string, string>): boolean {
  if (questions.length === 0) return true;
  return questions.every((q) => q.id in answers && answers[q.id] !== undefined);
}

/**
 * Calculate total steps in the wizard
 */
function getTotalSteps(): number {
  return 1 + // intro
         4 + // domains
         1 + // review
         1 + // analyzing
         1;  // results
}

/**
 * Get current step number for progress display
 */
function getCurrentStepNumber(step: WizardStep, domainIndex: number): number {
  switch (step) {
    case 'intro':
      return 1;
    case 'domains':
      return 2 + domainIndex; // 2, 3, 4, 5
    case 'review':
      return 6;
    case 'analyzing':
      return 7;
    case 'results':
      return 8;
    default:
      return 1;
  }
}

/**
 * Get step label for progress display
 */
function getStepLabel(step: WizardStep, domainIndex: number, questionsByDomain: QuestionsByDomain | null): string {
  switch (step) {
    case 'intro':
      return 'Child Information';
    case 'domains':
      if (questionsByDomain) {
        const domain = DOMAIN_ORDER[domainIndex];
        return DOMAIN_LABELS[domain];
      }
      return 'Assessment';
    case 'review':
      return 'Review Answers';
    case 'analyzing':
      return 'Analyzing';
    case 'results':
      return 'Results';
    default:
      return '';
  }
}

export function ScreeningWizard() {
  const router = useRouter();
  const { currentUser } = useFamilyStore();
  const [step, setStep] = useState<WizardStep>('intro');
  const [childName, setChildName] = useState('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [questionsByDomain, setQuestionsByDomain] = useState<QuestionsByDomain | null>(null);
  const [ageInMonths, setAgeInMonths] = useState<number | null>(null);
  const [screeningId, setScreeningId] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<'High' | 'Low' | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Redirect if not logged in or not a parent
  useEffect(() => {
    if (!currentUser) {
      router.push('/');
      return;
    }
    if (currentUser.role !== 'parent') {
      router.push('/');
      return;
    }
  }, [currentUser, router]);

  const handleStartScreening = () => {
    if (!childName.trim()) {
      toast.error('Please enter the child\'s name');
      return;
    }

    if (!birthDate) {
      toast.error('Please enter the child\'s date of birth');
      return;
    }

    const birth = new Date(birthDate);
    const today = new Date();
    
    if (isNaN(birth.getTime())) {
      toast.error('Please enter a valid date of birth');
      return;
    }

    if (birth > today) {
      toast.error('Date of birth cannot be in the future');
      return;
    }

    // Calculate age in months
    const age = calculateAgeInMonths(birth);
    
    if (age < 0 || age > 36) {
      toast.error('Child age must be between 0 and 36 months');
      return;
    }

    setAgeInMonths(age);

    // Load questions for this age
    try {
      const questions = getQuestionsByDomain(age);
      setQuestionsByDomain(questions);
      
      // Move to first domain
      setCurrentDomainIndex(0);
      setStep('domains');
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load screening questions. Please try again.');
    }
  };

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNextDomain = () => {
    if (!questionsByDomain) return;

    const currentDomain = DOMAIN_ORDER[currentDomainIndex];
    const domainQuestions = getDomainQuestions(currentDomain, questionsByDomain);
    
    if (!isDomainComplete(currentDomain, domainQuestions, answers)) {
      toast.error('Please answer all questions in this domain before continuing');
      return;
    }

    // Move to next domain
    if (currentDomainIndex < DOMAIN_ORDER.length - 1) {
      setCurrentDomainIndex(currentDomainIndex + 1);
    } else {
      // All domains complete, move to review
      setStep('review');
    }
  };

  const handlePreviousDomain = () => {
    if (currentDomainIndex > 0) {
      setCurrentDomainIndex(currentDomainIndex - 1);
    } else {
      setStep('intro');
    }
  };

  const handleSubmit = async () => {
    if (!questionsByDomain || !ageInMonths) {
      toast.error('Missing screening data. Please start over.');
      return;
    }

    // Validate all questions are answered
    const allQuestions: DenverQuestion[] = [];
    DOMAIN_ORDER.forEach((domain) => {
      allQuestions.push(...getDomainQuestions(domain, questionsByDomain));
    });

    const unansweredQuestions = allQuestions.filter(
      (q) => !answers[q.id] || answers[q.id] === undefined
    );

    if (unansweredQuestions.length > 0) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    if (!currentUser) {
      toast.error('Please log in to submit screening');
      return;
    }

    setStep('analyzing');

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      console.log('=== SCREENING SUBMISSION START ===');
      console.log('Family ID:', currentUser.familyId);
      console.log('Child Name:', childName.trim());
      console.log('Age:', ageInMonths);
      console.log('Answers count:', Object.keys(answers).length);
      console.log('Answers:', answers);

      const result = await submitScreening(
        currentUser.familyId,
        childName.trim(),
        ageInMonths,
        answers
      );

      console.log('=== SUBMISSION RESULT ===');
      console.log('Result object:', result);
      console.log('Success:', result?.success);
      console.log('Screening ID:', result?.screening_id);
      console.log('Risk Level:', result?.risk_level);
      console.log('Error:', result?.error);

      if (result && result.success && result.screening_id) {
        console.log('✅ Screening submitted successfully!');
        setScreeningId(result.screening_id);
        setRiskLevel(result.risk_level);
        setStep('results');
        toast.success('Screening analysis complete!');
      } else {
        const errorMsg = result?.error || 'Failed to submit screening - no error message provided';
        console.error('❌ Submission failed:', errorMsg);
        console.error('Full result:', JSON.stringify(result, null, 2));
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('=== ERROR IN SUBMISSION HANDLER ===');
      console.error('Error type:', typeof error);
      console.error('Error:', error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      const errorMessage = error instanceof Error ? error.message : 'Failed to submit screening';

      toast.error('Screening Submission Failed', {
        description: errorMessage,
        duration: 10000,
      });

      setStep('review');
    }
  };

  const handlePaySpecialist = () => {
    setIsPaymentModalOpen(true);
  };

  const handleStartNewScreening = () => {
    setStep('intro');
    setChildName('');
    setBirthDate('');
    setCurrentDomainIndex(0);
    setAnswers({});
    setQuestionsByDomain(null);
    setAgeInMonths(null);
    setScreeningId(null);
    setRiskLevel(null);
  };

  if (!currentUser || currentUser.role !== 'parent') {
    return null;
  }

  const currentStepNumber = getCurrentStepNumber(step, currentDomainIndex);
  const totalSteps = getTotalSteps();
  const stepLabel = getStepLabel(step, currentDomainIndex, questionsByDomain);

  // Get current domain questions
  const currentDomain = step === 'domains' ? DOMAIN_ORDER[currentDomainIndex] : null;
  const currentDomainQuestions = currentDomain && questionsByDomain
    ? getDomainQuestions(currentDomain, questionsByDomain)
    : [];

  const isCurrentDomainComplete = currentDomain && questionsByDomain
    ? isDomainComplete(currentDomain, currentDomainQuestions, answers)
    : false;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Progress Bar */}
      {step !== 'intro' && step !== 'results' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStepNumber} of {totalSteps}
            </span>
            <span className="text-sm font-medium">{stepLabel}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStepNumber / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step 1: Intro - Child Name & Date of Birth */}
      {step === 'intro' && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Pediatric Developmental Screening</CardTitle>
            <CardDescription>
              Complete a quick screening to assess your child's developmental milestones using the Denver II assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="childName" className="text-sm font-medium">
                Child's Name
              </label>
              <Input
                id="childName"
                placeholder="Enter child's name"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="birthDate" className="text-sm font-medium">
                Date of Birth
              </label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Enter your child's date of birth (ages 0-36 months)
              </p>
            </div>
            <Button
              onClick={handleStartScreening}
              disabled={!childName.trim() || !birthDate}
              className="w-full"
            >
              Start Screening
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Domains - Sequential Domain Questions */}
      {step === 'domains' && questionsByDomain && currentDomain && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = DOMAIN_ICONS[currentDomain];
                return <Icon className="h-5 w-5" />;
              })()}
              <CardTitle>{DOMAIN_LABELS[currentDomain]}</CardTitle>
            </div>
            <CardDescription>
              Answer each question based on your child's current abilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentDomainQuestions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No questions available for this domain at this age.
              </p>
            ) : (
              currentDomainQuestions.map((question) => {
                const answer = answers[question.id];
                return (
                  <div key={question.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className={DOMAIN_COLORS[currentDomain]}>
                        {DOMAIN_LABELS[currentDomain]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Age range: {question.ageRangeMonths.start}-{question.ageRangeMonths.end} months
                      </span>
                    </div>
                    <p className="font-medium">{question.questionText}</p>
                    <div className="flex gap-2">
                      <Button
                        variant={answer === 'Yes' ? 'default' : 'outline'}
                        onClick={() => handleAnswerChange(question.id, 'Yes')}
                        className="flex-1"
                      >
                        Yes
                      </Button>
                      <Button
                        variant={answer === 'Not Yet' ? 'default' : 'outline'}
                        onClick={() => handleAnswerChange(question.id, 'Not Yet')}
                        className="flex-1"
                      >
                        Not Yet
                      </Button>
                      <Button
                        variant={answer === 'No' ? 'default' : 'outline'}
                        onClick={() => handleAnswerChange(question.id, 'No')}
                        className="flex-1"
                      >
                        No
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handlePreviousDomain}
                variant="outline"
                className="flex-1"
              >
                {currentDomainIndex === 0 ? 'Back' : 'Previous Domain'}
              </Button>
              <Button
                onClick={handleNextDomain}
                disabled={!isCurrentDomainComplete || currentDomainQuestions.length === 0}
                className="flex-1"
              >
                {currentDomainIndex < DOMAIN_ORDER.length - 1 ? 'Next Domain' : 'Review Answers'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review - Summary of All Answers */}
      {step === 'review' && questionsByDomain && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Review Your Answers</CardTitle>
            <CardDescription>
              Please review your answers before submitting. You can go back to edit if needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {DOMAIN_ORDER.map((domain) => {
              const domainQuestions = getDomainQuestions(domain, questionsByDomain);
              if (domainQuestions.length === 0) return null;

              const Icon = DOMAIN_ICONS[domain];
              return (
                <div key={domain} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <h3 className="font-semibold">{DOMAIN_LABELS[domain]}</h3>
                  </div>
                  <div className="space-y-2 pl-7">
                    {domainQuestions.map((question) => {
                      const answer = answers[question.id];
                      return (
                        <div key={question.id} className="flex items-start justify-between text-sm">
                          <span className="text-muted-foreground flex-1">{question.questionText}</span>
                          <Badge variant="outline" className="ml-2">
                            {answer || 'Not answered'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  setCurrentDomainIndex(DOMAIN_ORDER.length - 1);
                  setStep('domains');
                }}
                variant="outline"
                className="flex-1"
              >
                Back to Edit
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                size="lg"
              >
                Submit Screening
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Analyzing */}
      {step === 'analyzing' && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Analyzing...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Processing your screening responses
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Results */}
      {step === 'results' && riskLevel && (
        <div className="space-y-6">
          {riskLevel === 'High' ? (
            <Card className="w-full max-w-2xl mx-auto border-red-200 bg-red-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <CardTitle className="text-red-900">Consult Specialist (Private)</CardTitle>
                </div>
                <CardDescription className="text-red-700">
                  Based on the screening results, a clinical review is recommended.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center mb-2">
                  <Badge variant="destructive" className="text-base px-4 py-2">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    High Risk
                  </Badge>
                </div>
                <div className="p-4 bg-white rounded-lg border border-red-200">
                  <p className="text-sm text-muted-foreground mb-2">Screening ID:</p>
                  <p className="font-mono text-xs break-all">{screeningId}</p>
                </div>
                <Button
                  onClick={handlePaySpecialist}
                  className="w-full bg-red-600 hover:bg-red-700"
                  size="lg"
                >
                  Consult Specialist (Private)
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Your payment will be processed privately and securely
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full max-w-2xl mx-auto border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <CardTitle className="text-green-900">Screening Complete</CardTitle>
                </div>
                <CardDescription className="text-green-700">
                  Developmental milestones appear on track.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your child's developmental progress looks good. Continue monitoring and
                  consult with your pediatrician if you have any concerns.
                </p>
                <Button
                  onClick={handleStartNewScreening}
                  variant="outline"
                  className="w-full"
                >
                  Start New Screening
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Payment Modal */}
      <ClinicPaymentModal
        isOpen={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        screeningId={screeningId || undefined}
      />
    </div>
  );
}
