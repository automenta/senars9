//! An implementation of the `LMService` trait using the `langchain-rust` library
//! to connect to any OpenAI-compatible API endpoint.

use super::{
    Answer, Explanation, GenerationOptions, Hypothesis, LMError, LMService, ModelCapability, Plan,
    ReasoningStep, SimilarConcept,
};
use async_trait::async_trait;
use langchain_rust::{
    chain::Chain,
    llm::openai::{OpenAI, OpenAIModel},
    prompt::HumanMessagePromptTemplate,
    schemas::prompt::ChatMessagePromptTemplate,
    template_f,
};
use std::env;

/// A service that wraps a `langchain-rust` client for an OpenAI-compatible API.
#[derive(Debug, Clone)]
pub struct OpenAICompatibleService {
    client: OpenAI,
}

impl OpenAICompatibleService {
    /// Creates a new instance of the service, initializing the client from
    /// environment variables.
    ///
    /// It expects the following environment variables:
    /// - `OAI_API_KEY`: The API key.
    /// - `OAI_BASE_URL`: The base URL of the compatible API endpoint.
    /// - `OAI_MODEL`: The name of the model to use.
    pub fn new() -> Result<Self, LMError> {
        dotenvy::dotenv().ok();

        let api_key = env::var("OAI_API_KEY").map_err(|_| LMError::ProviderUnavailable)?;
        let base_url = env::var("OAI_BASE_URL").map_err(|_| LMError::ProviderUnavailable)?;
        let model = env::var("OAI_MODEL").map_err(|_| LMError::ProviderUnavailable)?;

        let client = OpenAI::default()
            .with_api_key(api_key)
            .with_api_base(base_url)
            .with_model(OpenAIModel::Custom(model));

        Ok(Self { client })
    }
}

#[async_trait]
impl LMService for OpenAICompatibleService {
    async fn generate_text(&self, prompt: String, _options: Option<GenerationOptions>) -> Result<String, LMError> {
        let human_prompt = HumanMessagePromptTemplate::new(template_f!(
            "{prompt}",
            "prompt"
        ));

        let chain = Chain::new(self.client.clone()).with_prompt(vec![
            ChatMessagePromptTemplate::Human(human_prompt),
        ]);

        let result = chain.invoke(vec![("prompt", prompt)]).await.map_err(|e| LMError::ApiError(e.to_string()))?;

        Ok(result)
    }

    async fn generate_embedding(&self, _text: String) -> Result<Vec<f32>, LMError> {
        unimplemented!("This feature is not yet implemented for the OpenAI-Compatible service.");
    }

    async fn answer_question(&self, _context: String, _question: String) -> Result<Answer, LMError> {
        unimplemented!("This feature is not yet implemented for the OpenAI-Compatible service.");
    }

    async fn generate_hypothesis(
        &self,
        _observations: Vec<String>,
        _constraints: Vec<String>,
    ) -> Result<Vec<Hypothesis>, LMError> {
        unimplemented!("This feature is not yet implemented for the OpenAI-Compatible service.");
    }

    async fn repair_plan(&self, _failed_plan: Plan, _error: String) -> Result<Plan, LMError> {
        unimplemented!("This feature is not yet implemented for the OpenAI-Compatible service.");
    }

    async fn explain_reasoning(
        &self,
        _reasoning_trace: Vec<ReasoningStep>,
    ) -> Result<Explanation, LMError> {
        unimplemented!("This feature is not yet implemented for the OpenAI-Compatible service.");
    }

    async fn find_similar_concepts(
        &self,
        _concept: String,
        _domain: Option<String>,
    ) -> Result<Vec<SimilarConcept>, LMError> {
        unimplemented!("This feature is not yet implemented for the OpenAI-Compatible service.");
    }

    fn get_provider_name(&self) -> String {
        format!("OpenAI-Compatible ({})", self.client.api_base)
    }

    fn get_capabilities(&self) -> Vec<ModelCapability> {
        vec![ModelCapability::TextGeneration]
    }

    async fn health_check(&self) -> Result<(), LMError> {
        // A simple health check could be to generate a short piece of text.
        self.generate_text("health check".to_string(), None).await?;
        Ok(())
    }
}