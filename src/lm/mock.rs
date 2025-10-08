//! A mock implementation of the `LMService` for testing purposes.

use super::{
    Answer, Explanation, GenerationOptions, Hypothesis, LMError, LMService, ModelCapability, Plan,
    ReasoningStep, SimilarConcept,
};
use async_trait::async_trait;

/// A mock LM service that returns predictable, hard-coded responses.
///
/// This is useful for testing components that depend on an `LMService` without
/// making actual API calls, which would be slow, expensive, and non-deterministic.
#[derive(Debug, Default)]
pub struct MockLMService;

impl MockLMService {
    pub fn new() -> Self {
        MockLMService {}
    }
}

#[async_trait]
impl LMService for MockLMService {
    async fn generate_text(&self, prompt: String, _options: Option<GenerationOptions>) -> Result<String, LMError> {
        Ok(format!("Mock response for prompt: {}", prompt))
    }

    async fn generate_embedding(&self, text: String) -> Result<Vec<f32>, LMError> {
        // Return a deterministic embedding based on the text length.
        let embedding_value = (text.len() % 100) as f32 / 100.0;
        Ok(vec![embedding_value; 128]) // Return a 128-dim vector
    }

    async fn answer_question(&self, context: String, question: String) -> Result<Answer, LMError> {
        Ok(Answer {
            text: format!("Mock answer to '{}' based on '{}'", question, context),
            confidence: 0.9,
            reasoning: Some("Mock reasoning".to_string()),
            sources: vec!["mock_source_1".to_string()],
        })
    }

    async fn generate_hypothesis(
        &self,
        observations: Vec<String>,
        _constraints: Vec<String>,
    ) -> Result<Vec<Hypothesis>, LMError> {
        Ok(vec![Hypothesis {
            statement: format!("Mock hypothesis from observations: {:?}", observations),
            confidence: 0.75,
            supporting_evidence: vec!["obs1".to_string()],
            testable_predictions: vec!["pred1".to_string()],
        }])
    }

    async fn repair_plan(&self, failed_plan: Plan, error: String) -> Result<Plan, LMError> {
        Ok(Plan {
            steps: vec![
                "Mock repaired step 1".to_string(),
                format!("based on plan {:?} and error '{}'", failed_plan.steps, error),
            ],
        })
    }

    async fn explain_reasoning(
        &self,
        reasoning_trace: Vec<ReasoningStep>,
    ) -> Result<Explanation, LMError> {
        Ok(Explanation {
            summary: format!("Mock explanation for trace: {:?}", reasoning_trace),
        })
    }

    async fn find_similar_concepts(
        &self,
        concept: String,
        _domain: Option<String>,
    ) -> Result<Vec<SimilarConcept>, LMError> {
        Ok(vec![
            SimilarConcept {
                name: format!("similar_to_{}", concept),
                similarity: 0.88,
            },
        ])
    }

    fn get_provider_name(&self) -> String {
        "MockLMServiceProvider".to_string()
    }



    fn get_capabilities(&self) -> Vec<ModelCapability> {
        vec![
            ModelCapability::TextGeneration,
            ModelCapability::Embedding,
            ModelCapability::QuestionAnswering,
            ModelCapability::HypothesisGeneration,
            ModelCapability::PlanRepair,
        ]
    }

    async fn health_check(&self) -> Result<(), LMError> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_generate_text() {
        let service = MockLMService::new();
        let response = service.generate_text("test prompt".to_string(), None).await.unwrap();
        assert_eq!(response, "Mock response for prompt: test prompt");
    }

    #[tokio::test]
    async fn test_mock_generate_embedding() {
        let service = MockLMService::new();
        let embedding = service.generate_embedding("test".to_string()).await.unwrap();
        assert_eq!(embedding.len(), 128);
        assert_eq!(embedding[0], 0.04); // "test".len() = 4
    }

    #[tokio::test]
    async fn test_mock_answer_question() {
        let service = MockLMService::new();
        let answer = service.answer_question("context".to_string(), "question?".to_string()).await.unwrap();
        assert_eq!(answer.text, "Mock answer to 'question?' based on 'context'");
        assert_eq!(answer.confidence, 0.9);
    }

    #[tokio::test]
    async fn test_mock_get_provider_name() {
        let service = MockLMService::new();
        assert_eq!(service.get_provider_name(), "MockLMServiceProvider");
    }

    #[tokio::test]
    async fn test_mock_health_check() {
        let service = MockLMService::new();
        assert!(service.health_check().await.is_ok());
    }
}