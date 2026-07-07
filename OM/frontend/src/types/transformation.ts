// Типы трансформаций — совпадают с api/models.py.

export interface Transformation {
  id: string
  name: string
  title: string
  description: string
  prompt: string
  apply_default: boolean
  created: string
  updated: string
}

export interface TransformationCreate {
  name: string
  title: string
  description: string
  prompt: string
  apply_default?: boolean
}

export interface TransformationUpdate {
  name?: string
  title?: string
  description?: string
  prompt?: string
  apply_default?: boolean
}

export interface TransformationExecuteRequest {
  transformation_id: string
  input_text: string
  model_id: string
}

export interface TransformationExecuteResponse {
  output: string
  transformation_id: string
  model_id: string
}

export interface DefaultPrompt {
  transformation_instructions: string
}
