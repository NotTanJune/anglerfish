import type { PatternType } from '../types'
import { TickingBomb } from './geometries/TickingBomb'
import { ScarcitySkeleton } from './geometries/ScarcitySkeleton'
import { MimicChest } from './geometries/MimicChest'
import { WallTrap } from './geometries/WallTrap'
import { GhostHorde } from './geometries/GhostHorde'
import { FloorTrap } from './geometries/FloorTrap'
import { LockedDoor } from './geometries/LockedDoor'
import { GuiltyGhost } from './geometries/GuiltyGhost'
import { ShapeShifter } from './geometries/ShapeShifter'
import { SwarmBats } from './geometries/SwarmBats'
import { RiddleSphinx } from './geometries/RiddleSphinx'
import { PricePhantom } from './geometries/PricePhantom'
import { AnglerFishMonster } from './geometries/AnglerFish'

interface Props {
  patternType: PatternType
  color: string
  glowColor: string
}

const COMPONENTS: Record<PatternType, React.FC<{ color: string; glowColor: string }>> = {
  urgency: TickingBomb,
  scarcity: ScarcitySkeleton,
  misdirection: MimicChest,
  forced_action: WallTrap,
  social_proof: GhostHorde,
  sneaking: FloorTrap,
  obstruction: LockedDoor,
  confirmshaming: GuiltyGhost,
  disguised_ads: ShapeShifter,
  nagging: SwarmBats,
  trick_questions: RiddleSphinx,
  hidden_costs: PricePhantom,
  bait_and_switch: AnglerFishMonster,
}

export function MonsterFactory({ patternType, color, glowColor }: Props) {
  const Component = COMPONENTS[patternType]
  return <Component color={color} glowColor={glowColor} />
}
