export function getCredentialStatus(credential) {
  if (credential.revoked) return 'Revoked'
  if (new Date(`${credential.expiresAt}T23:59:59`) < new Date()) return 'Expired'
  return 'Valid'
}

export function calculateTrustScore(agent) {
  const credentialPoints = getCredentialStatus(agent.credential) === 'Valid' ? 30 : 0
  return Math.min(100, Math.max(0, agent.factors.identity + credentialPoints + agent.factors.history + agent.factors.behavior))
}

export function getTrustBreakdown(agent) {
  return [
    { label: 'Identity verification', score: agent.factors.identity, max: 30 },
    { label: 'Credential validity', score: getCredentialStatus(agent.credential) === 'Valid' ? 30 : 0, max: 30 },
    { label: 'Access history', score: agent.factors.history, max: 20 },
    { label: 'Observed behaviour', score: agent.factors.behavior, max: 20 },
  ]
}

export function evaluateAccess(agent, resource) {
  const credentialStatus = getCredentialStatus(agent.credential)
  const trustScore = calculateTrustScore(agent)
  const reasons = []

  if (credentialStatus !== 'Valid') reasons.push(`Credential is ${credentialStatus.toLowerCase()}.`)
  if (trustScore < resource.minTrust) reasons.push(`Trust score ${trustScore} is below the ${resource.minTrust} minimum.`)
  if (!agent.capabilities.includes(resource.requiredCapability)) {
    reasons.push(`Agent is missing the ${resource.requiredCapability} capability required by this resource policy.`)
  }

  return {
    decision: reasons.length === 0 ? 'Allow' : 'Deny',
    reasons: reasons.length === 0 ? ['Credential, trust threshold, and resource policy requirements are satisfied.'] : reasons,
    credentialStatus,
    trustScore,
  }
}