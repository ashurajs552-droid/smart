import * as faceapi from 'face-api.js'

export type RosterEntry = {
  student_id: string
  student_name: string
  descriptors: number[][]
}

export type Matcher = faceapi.FaceMatcher | null

export async function loadRosterFromSupabase(supabase: any): Promise<RosterEntry[]> {
  try {
    const { data, error } = await supabase.from('students').select('student_id, student_name, descriptors')
    if (error) return []
    return (data || []) as RosterEntry[]
  } catch {
    return []
  }
}

export function buildMatcher(entries: RosterEntry[]): Matcher {
  if (!entries || entries.length === 0) return null
  const labeled = entries
    .filter(e => Array.isArray(e.descriptors) && e.descriptors.length)
    .map(e => new faceapi.LabeledFaceDescriptors(
      `${e.student_id}::${e.student_name}`,
      e.descriptors.map(d => new Float32Array(d) as Float32Array)
    ))
  if (labeled.length === 0) return null
  return new faceapi.FaceMatcher(labeled, 0.6)
}
