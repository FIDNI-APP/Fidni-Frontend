import React, { useState } from 'react';
import { ArrowLeft, ThumbsUp, ThumbsDown, CheckCircle, X, Lightbulb } from 'lucide-react';
import type { Quiz } from '@/types/learningPath';

interface QuizInterfaceProps {
  quiz: Quiz;
  onClose: () => void;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({ quiz, onClose }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = () => {
    setShowResult(true);
  };

  const isCorrect = selectedAnswer === quiz.correctAnswer;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header avec progression */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Barre de progression */}
          <div className="w-full bg-blue-500/30 rounded-full h-2 mb-6">
            <div className="bg-white h-2 rounded-full shadow-sm" style={{ width: '33%' }}></div>
          </div>
          
          <button
            onClick={onClose}
            className="group flex items-center text-white hover:text-blue-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Retour au cours</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Question */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <div className="mb-8">
            <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              QUESTION 1
            </div>
            <h1 className="text-2xl font-bold text-slate-900 leading-relaxed">
             {quiz.question}
           </h1>
         </div>

         <div className="space-y-4">
           {quiz.options.map((option, index) => (
             <button
               key={index}
               onClick={() => !showResult && setSelectedAnswer(index)}
               disabled={showResult}
               className={`w-full p-6 text-left rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.01] ${
                 showResult
                   ? index === quiz.correctAnswer
                     ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-lg scale-[1.02]'
                     : index === selectedAnswer && index !== quiz.correctAnswer
                     ? 'border-red-500 bg-red-50 text-red-800 shadow-lg'
                     : 'border-slate-200 bg-slate-50 text-slate-600'
                   : selectedAnswer === index
                   ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-lg scale-[1.02]'
                   : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-md'
               }`}
             >
               <div className="flex items-center space-x-4">
                 <span className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                   showResult
                     ? index === quiz.correctAnswer
                       ? 'border-emerald-500 bg-emerald-500 text-white'
                       : index === selectedAnswer && index !== quiz.correctAnswer
                       ? 'border-red-500 bg-red-500 text-white'
                       : 'border-slate-300 bg-white text-slate-600'
                     : selectedAnswer === index
                     ? 'border-blue-500 bg-blue-500 text-white'
                     : 'border-slate-300 bg-white text-slate-600'
                 }`}>
                   {String.fromCharCode(65 + index)}
                 </span>
                 <span className="text-lg font-medium">{option}</span>
                 
                 {/* Icônes de validation */}
                 {showResult && index === quiz.correctAnswer && (
                   <CheckCircle className="w-6 h-6 text-emerald-500 ml-auto" />
                 )}
                 {showResult && index === selectedAnswer && index !== quiz.correctAnswer && (
                   <X className="w-6 h-6 text-red-500 ml-auto" />
                 )}
               </div>
             </button>
           ))}
         </div>
       </div>

       {/* Résultat et explication */}
       {showResult && (
         <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
           <div className={`flex items-start space-x-6 ${
             isCorrect ? 'text-emerald-800' : 'text-red-800'
           }`}>
             <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
               isCorrect ? 'bg-emerald-500' : 'bg-red-500'
             }`}>
               {isCorrect ? (
                 <CheckCircle className="w-8 h-8 text-white" />
               ) : (
                 <X className="w-8 h-8 text-white" />
               )}
             </div>
             
             <div className="flex-1">
               <h3 className={`text-2xl font-bold mb-4 ${
                 isCorrect ? 'text-emerald-800' : 'text-red-800'
               }`}>
                 {isCorrect ? '🎉 Excellente réponse !' : '❌ Réponse incorrecte'}
               </h3>
               
               <p className={`text-lg leading-relaxed mb-6 ${
                 isCorrect ? 'text-emerald-700' : 'text-red-700'
               }`}>
                 {quiz.explanation}
               </p>
               
               {!isCorrect && (
                 <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl">
                   <div className="flex items-start space-x-3">
                     <Lightbulb className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
                     <div>
                       <p className="font-bold text-emerald-800 mb-2">✅ Bonne réponse :</p>
                       <p className="text-emerald-700">
                         <strong>{String.fromCharCode(65 + quiz.correctAnswer)}.</strong> {quiz.options[quiz.correctAnswer]}
                       </p>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}

       {/* Actions */}
       <div className="flex justify-between items-center">
         <button
           onClick={onClose}
           className="flex items-center space-x-2 px-6 py-3 text-slate-400 hover:text-slate-600 transition-colors"
         >
           <ArrowLeft className="w-5 h-5" />
           <span className="font-medium">Quitter</span>
         </button>
         
         {!showResult ? (
           <button
             onClick={handleSubmit}
             disabled={selectedAnswer === null}
             className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
           >
             Valider la réponse
           </button>
         ) : (
           <div className="flex items-center space-x-6">
             <div className="flex items-center space-x-4 text-slate-500">
               <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                 <ThumbsUp className="w-5 h-5" />
               </button>
               <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                 <ThumbsDown className="w-5 h-5" />
               </button>
               <span className="text-sm font-medium">Évaluer cette question</span>
             </div>
             
             <button
               onClick={onClose}
               className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
             >
               Question suivante
             </button>
           </div>
         )}
       </div>
     </div>
   </div>
 );
};