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
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type WizardStep = 'input' | 'questions' | 'analyzing' | 'results';

interface MVPQuestion {
  questionId: string;
  questionText: string;
  category: 'gross_motor' | 'language';
  milestoneAgeMonths: number;
}

// MVP Questions - Simplified subset for demo
const MVP_QUESTIONS: MVPQuestion[] = [
  // Gross Motor questions
  {
    questionId: 'gm_mvp_1',
    questionText: 'Walks well',
    category: 'gross_motor',
    milestoneAgeMonths: 13,
  },
  {
    questionId: 'gm_mvp_2',
    questionText: 'Stoops and recovers',
    category: 'gross_motor',
    milestoneAgeMonths: 15,
  },
  {
    questionId: 'gm_mvp_3',
    questionText: 'Runs steadily',
    category: 'gross_motor',
    milestoneAgeMonths: 20,
  },
  // Language questions
  {
    questionId: 'lang_mvp_1',
    questionText: 'Says 3 words',
    category: 'language',
    milestoneAgeMonths: 14,
  },
  {
    questionId: 'lang_mvp_2',
    questionText: 'Follows simple commands',
    category: 'language',
    milestoneAgeMonths: 17,
  },
  {
    questionId: 'lang_mvp_3',
    questionText: 'Uses 2-word phrases',
    category: 'language',
    milestoneAgeMonths: 26,
  },
];

const categoryLabels: Record<string, string> = {
  gross_motor: 'Gross Motor',
  language: 'Language',
};

const categoryColors: Record<string, string> = {
  gross_motor: 'bg-blue-100 text-blue-800',
  language: 'bg-purple-100 text-purple-800',
};

export function ScreeningWizard() {
  const router = useRouter();
  const { currentUser } = useFamilyStore();
  const [step, setStep] = useState<WizardStep>('input');
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [answers, setAnswers] = useState<Map<string, boolean>>(new Map());
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
    if (!childName.trim() || age === '' || age < 0 || age > 36) {
      toast.error('Please enter a valid child name and age (0-36 months)');
      return;
    }

    setStep('questions');
  };

  const handleAnswerToggle = (questionId: string, value: boolean) => {
    setAnswers((prev) => {
      const newMap = new Map(prev);
      newMap.set(questionId, value);
      return newMap;
    });
  };

  const handleSubmit = async () => {
    // Validate all questions answered
    const unansweredQuestions = MVP_QUESTIONS.filter(
      (q) => !answers.has(q.questionId)
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

    // Simulate Groq delay (2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      // Log submission attempt
      console.log('=== SCREENING SUBMISSION START ===');
      console.log('Family ID:', currentUser.familyId);
      console.log('Child Name:', childName.trim());
      console.log('Age:', Number(age));
      console.log('Answers count:', answers.size);
      console.log('Answers:', Array.from(answers.entries()));
      
      // 1. Call Server Action
      const result = await submitScreening(
        currentUser.familyId,
        childName.trim(),
        Number(age),
        answers
      );

      console.log('=== SUBMISSION RESULT ===');
      console.log('Result object:', result);
      console.log('Success:', result?.success);
      console.log('Screening ID:', result?.screening_id);
      console.log('Risk Level:', result?.risk_level);
      console.log('Error:', result?.error);

      // 2. Check result and SAVE THE ID
      if (result && result.success && result.screening_id) {
        console.log('✅ Screening submitted successfully!');
        setScreeningId(result.screening_id);
        setRiskLevel(result.risk_level);
        
        // 3. FORCE NAVIGATION TO RESULT VIEW
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
      
      // Show detailed error toast
      toast.error('Screening Submission Failed', {
        description: errorMessage,
        duration: 10000, // Longer duration to ensure user sees it
      });
      
      // Keep user on questions page so they can try again
      setStep('questions');
    }
  };

  const handlePaySpecialist = () => {
    setIsPaymentModalOpen(true);
  };

  const allQuestionsAnswered = MVP_QUESTIONS.every((q) => answers.has(q.questionId));

  if (!currentUser || currentUser.role !== 'parent') {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Step 1: Input Child Name & Age */}
      {step === 'input' && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Pediatric Developmental Screening</CardTitle>
            <CardDescription>
              Complete a quick screening to assess your child's developmental milestones.
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
              <label htmlFor="age" className="text-sm font-medium">
                Age (in months)
              </label>
              <Input
                id="age"
                type="number"
                min="0"
                max="36"
                placeholder="e.g., 12"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              />
              <p className="text-xs text-muted-foreground">
                Enter your child's age in months (0-36 months)
              </p>
            </div>
            <Button
              onClick={handleStartScreening}
              disabled={!childName.trim() || age === ''}
              className="w-full"
            >
              Start Screening
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Questions */}
      {step === 'questions' && (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Screening Questions</CardTitle>
            <CardDescription>
              Answer Yes or No for each milestone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {MVP_QUESTIONS.map((question) => {
              const answer = answers.get(question.questionId);
              return (
                <div key={question.questionId} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={categoryColors[question.category] || 'bg-gray-100 text-gray-800'}>
                      {categoryLabels[question.category] || question.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Expected at {question.milestoneAgeMonths} months
                    </span>
                  </div>
                  <p className="font-medium">{question.questionText}</p>
                  <div className="flex gap-2">
                    <Button
                      variant={answer === true ? 'default' : 'outline'}
                      onClick={() => handleAnswerToggle(question.questionId, true)}
                      className="flex-1"
                    >
                      Yes
                    </Button>
                    <Button
                      variant={answer === false ? 'default' : 'outline'}
                      onClick={() => handleAnswerToggle(question.questionId, false)}
                      className="flex-1"
                    >
                      No
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered}
              className="w-full"
              size="lg"
            >
              Submit Screening
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Analyzing */}
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

      {/* Step 4: Results */}
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
                  onClick={() => {
                    setStep('input');
                    setChildName('');
                    setAge('');
                    setAnswers(new Map());
                    setScreeningId(null);
                    setRiskLevel(null);
                  }}
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
