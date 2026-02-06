import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './InterviewPage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

/**
 * InterviewPage Component
 * Main component for conducting interviews using the dataset and InterviewEngine
 */
const InterviewPage = ({ role = 'fullstack', level = 'mid', onComplete }) => {
  const [state, setState] = useState({
    phase: 'setup', // setup, loading, interview, complete
    interviewId: null,
    currentQuestion: null,
    answer: '',
    questionsAsked: 0,
    currentStage: null,
    questionsInStage: 0,
    isSubmitting: false,
    error: null
  });

  const [summary, setSummary] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);

  /**
   * Load questions from backend on component mount
   */
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        // First, load questions from dataset
        const loadResponse = await axios.get(`${API_BASE_URL}/questions/load`);
        
        if (loadResponse.data.success) {
          // Then get all questions
          const questionsResponse = await axios.get(`${API_BASE_URL}/questions`);
          setAllQuestions(questionsResponse.data.questions || []);
        }
      } catch (error) {
        console.error('Error loading questions:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to load questions from dataset'
        }));
      }
    };

    loadQuestions();
  }, []);

  /**
   * Start the interview
   */
  const startInterview = async () => {
    setState(prev => ({
      ...prev,
      phase: 'loading'
    }));

    try {
      const response = await axios.post(`${API_BASE_URL}/interview/start`, {
        role,
        level,
        allQuestions
      });

      if (response.data.success) {
        setState(prev => ({
          ...prev,
          phase: 'interview',
          interviewId: response.data.interviewId,
          currentQuestion: response.data.question,
          currentStage: response.data.question.stage,
          questionsInStage: 1,
          questionsAsked: 1
        }));
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      setState(prev => ({
        ...prev,
        phase: 'setup',
        error: 'Failed to start interview'
      }));
    }
  };

  /**
   * Submit answer and get next question
   */
  const submitAnswer = async () => {
    if (!state.answer.trim()) {
      setState(prev => ({
        ...prev,
        error: 'Please provide an answer before submitting'
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isSubmitting: true,
      error: null
    }));

    try {
      const response = await axios.post(`${API_BASE_URL}/interview/submit`, {
        interviewId: state.interviewId,
        questionId: state.currentQuestion.id,
        answer: state.answer
      });

      if (response.data.success) {
        if (response.data.interviewComplete) {
          // Get final summary
          const summaryResponse = await axios.get(
            `${API_BASE_URL}/interview/summary?interviewId=${state.interviewId}`
          );
          
          setSummary(summaryResponse.data.summary);
          setState(prev => ({
            ...prev,
            phase: 'complete',
            isSubmitting: false,
            answer: ''
          }));

          if (onComplete) {
            onComplete(summaryResponse.data.summary);
          }
        } else {
          // Move to next question
          setState(prev => ({
            ...prev,
            currentQuestion: response.data.question,
            currentStage: response.data.stage,
            questionsInStage: response.data.questionsAskedInStage,
            questionsAsked: response.data.totalQuestionsAsked,
            isSubmitting: false,
            answer: ''
          }));
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to submit answer',
        isSubmitting: false
      }));
    }
  };

  /**
   * Skip current question (for testing)
   */
  const skipQuestion = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/interview/skip`, {
        interviewId: state.interviewId
      });

      if (response.data.success) {
        if (response.data.interviewComplete) {
          setState(prev => ({
            ...prev,
            phase: 'complete'
          }));
        } else {
          setState(prev => ({
            ...prev,
            currentQuestion: response.data.nextQuestion,
            questionsAsked: prev.questionsAsked + 1,
            answer: ''
          }));
        }
      }
    } catch (error) {
      console.error('Error skipping question:', error);
    }
  };

  /**
   * Reset interview to start a new one
   */
  const resetInterview = () => {
    setState({
      phase: 'setup',
      interviewId: null,
      currentQuestion: null,
      answer: '',
      questionsAsked: 0,
      currentStage: null,
      questionsInStage: 0,
      isSubmitting: false,
      error: null
    });
    setSummary(null);
  };

  // Setup Phase - Select role and level
  if (state.phase === 'setup') {
    return (
      <div className="interview-container interview-setup">
        <div className="setup-card">
          <h1>MockMate Interview</h1>
          <p className="subtitle">
            Practice interviews using questions from our enhanced dataset
          </p>

          <div className="setup-info">
            <div className="info-item">
              <strong>Role:</strong> {role}
            </div>
            <div className="info-item">
              <strong>Level:</strong> {level}
            </div>
            <div className="info-item">
              <strong>Questions Ready:</strong> {allQuestions.length}
            </div>
          </div>

          {state.error && (
            <div className="error-message">{state.error}</div>
          )}

          <button 
            className="btn btn-primary btn-large"
            onClick={startInterview}
            disabled={allQuestions.length === 0}
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  // Loading Phase
  if (state.phase === 'loading') {
    return (
      <div className="interview-container interview-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading interview...</p>
        </div>
      </div>
    );
  }

  // Interview Phase - Display question and answer input
  if (state.phase === 'interview' && state.currentQuestion) {
    return (
      <div className="interview-container interview-active">
        <div className="interview-header">
          <div className="header-info">
            <div className="stage-badge">{state.currentStage.replace(/_/g, ' ').toUpperCase()}</div>
            <div className="progress">
              Question {state.questionsAsked} | Stage: {state.questionsInStage}
            </div>
          </div>
          <div className="interview-timer">
            Expected: {state.currentQuestion.expectedDuration}s
          </div>
        </div>

        <div className="interview-content">
          <div className="question-section">
            <h2 className="question-text">{state.currentQuestion.text}</h2>

            {state.currentQuestion.idealPoints && state.currentQuestion.idealPoints.length > 0 && (
              <div className="ideal-points">
                <h4>Key Points to Cover:</h4>
                <ul>
                  {state.currentQuestion.idealPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="answer-section">
            <textarea
              className="answer-input"
              placeholder="Type your answer here... Speak naturally about your approach."
              value={state.answer}
              onChange={(e) => setState(prev => ({
                ...prev,
                answer: e.target.value,
                error: null
              }))}
              disabled={state.isSubmitting}
            />

            {state.error && (
              <div className="error-message">{state.error}</div>
            )}

            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={submitAnswer}
                disabled={state.isSubmitting || !state.answer.trim()}
              >
                {state.isSubmitting ? 'Submitting...' : 'Submit Answer'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={skipQuestion}
                disabled={state.isSubmitting}
              >
                Skip
              </button>
            </div>
          </div>
        </div>

        <div className="interview-footer">
          <div className="rubric-preview">
            {state.currentQuestion.evaluationRubric && (
              <details>
                <summary>How this will be evaluated</summary>
                <ul>
                  {Object.entries(state.currentQuestion.evaluationRubric).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {value.description} ({Math.round(value.weight * 100)}%)
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Complete Phase - Show summary
  if (state.phase === 'complete' && summary) {
    return (
      <div className="interview-container interview-complete">
        <div className="summary-card">
          <h1>Interview Complete! 🎉</h1>

          <div className="summary-stats">
            <div className="stat-item">
              <span className="label">Total Questions:</span>
              <span className="value">{summary.totalQuestionsAsked}</span>
            </div>
            <div className="stat-item">
              <span className="label">Duration:</span>
              <span className="value">{summary.duration_minutes} minutes</span>
            </div>
            <div className="stat-item">
              <span className="label">Stages Completed:</span>
              <span className="value">{Object.keys(summary.stageBreakdown).length}</span>
            </div>
          </div>

          <div className="stage-breakdown">
            <h3>Questions per Stage:</h3>
            <table>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Questions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.stageBreakdown).map(([stage, count]) => (
                  <tr key={stage}>
                    <td>{stage.replace(/_/g, ' ').toUpperCase()}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="questions-asked">
            <h3>Questions Asked:</h3>
            <div className="questions-list">
              {summary.questions.map((q, idx) => (
                <div key={idx} className="question-item">
                  <span className="q-number">{idx + 1}.</span>
                  <span className="q-text">{q.question}</span>
                  <span className="q-stage">{q.stage}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-large"
            onClick={resetInterview}
          >
            Start New Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-container">
      <p>Loading interview...</p>
    </div>
  );
};

export default InterviewPage;
