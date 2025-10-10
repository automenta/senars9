//! Defines the `LMService` trait for interacting with language models.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;

// --- Error Handling ---

/// Defines the possible errors that can occur when interacting with an LM service.
#[derive(Error, Debug)]
pub enum LMError {
    #[error("API request failed: {0}")]
    ApiError(String),
    #[error("Failed to parse response from LM: {0}")]
    ParsingError(String),
    #[error("The requested provider is not available")]
    ProviderUnavailable,
    #[error("An unknown error occurred: {0}")]
    Unknown(String),
}

// --- Data Structures ---
// These structs correspond to the definitions in `NEXT.md`.

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationOptions {
    pub temperature: Option<f32>,
    pub max_tokens: Option<usize>,
    pub stop_sequences: Option<Vec<String>>,
    pub provider: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Answer {
    pub text: String,
    pub confidence: f32,
    pub reasoning: Option<String>,
    pub sources: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hypothesis {
    pub statement: String,
    pub confidence: f32,
    pub supporting_evidence: Vec<String>,
    pub testable_predictions: Vec<String>,
}

// Placeholders for more complex, future-defined structs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plan {
    pub steps: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReasoningStep {
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Explanation {
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarConcept {
    pub name: String,
    pub similarity: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModelCapability {
    TextGeneration,
    Embedding,
    QuestionAnswering,
    HypothesisGeneration,
    PlanRepair,
}

// --- LM Service Trait ---

/// Defines the interface for a Language Model (LM) service provider.
///
/// This trait abstracts the specific implementation of an LM provider (e.g., OpenAI,
/// a local model, a mock service) so that the rest of the system can interact with
/// it in a standard way.
#[async_trait]
pub trait LMService: Send + Sync {
    /// Generates text based on a given prompt.
    async fn generate_text(&self, prompt: String, options: Option<GenerationOptions>) -> Result<String, LMError>;

    /// Generates a vector embedding for a given piece of text.
    async fn generate_embedding(&self, text: String) -> Result<Vec<f32>, LMError>;

    /// Answers a question based on a provided context.
    async fn answer_question(&self, context: String, question: String) -> Result<Answer, LMError>;

    /// Generates a set of hypotheses from a list of observations and constraints.
    async fn generate_hypothesis(&self, observations: Vec<String>, constraints: Vec<String>) -> Result<Vec<Hypothesis>, LMError>;

    /// Attempts to repair a failed plan given the plan and an error description.
    async fn repair_plan(&self, failed_plan: Plan, error: String) -> Result<Plan, LMError>;

    /// Provides a human-readable explanation of a reasoning trace.
    async fn explain_reasoning(&self, reasoning_trace: Vec<ReasoningStep>) -> Result<Explanation, LMError>;

    /// Finds concepts that are semantically similar to a given concept.
    async fn find_similar_concepts(&self, concept: String, domain: Option<String>) -> Result<Vec<SimilarConcept>, LMError>;

    /// Returns the name of the underlying LM provider.
    fn get_provider_name(&self) -> String;

    /// Returns a list of the model's capabilities.
    fn get_capabilities(&self) -> Vec<ModelCapability>;

    /// Performs a health check on the LM service.
    async fn health_check(&self) -> Result<(), LMError>;
}