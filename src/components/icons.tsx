import {
  PawPrint,
  Bird,
  Fish,
  Turtle,
  Stethoscope,
  Scale,
  Soup,
  Eye,
  MapPin,
  ClipboardList,
  LucideProps,
  HelpCircle
} from 'lucide-react';
import type { RecordType } from '@prisma/client';

export const getSpeciesIcon = (species: string, props?: LucideProps) => {
  switch (species.toLowerCase()) {
    case 'koala':
    case 'kangaroo':
    case 'wombat':
    case 'possum':
    case 'echidna':
      return <PawPrint {...props} data-ai-hint="mammal paw" />;
    case 'kookaburra':
      return <Bird {...props} data-ai-hint="bird icon" />;
    case 'fish':
      return <Fish {...props} data-ai-hint="fish icon" />;
    case 'turtle':
        return <Turtle {...props} data-ai-hint="turtle icon" />;
    default:
      return <HelpCircle {...props} data-ai-hint="question mark" />;
  }
};

export const getRecordIcon = (type: RecordType, props?: LucideProps) => {
    switch(type) {
        case 'MEDICAL':
            return <Stethoscope {...props} data-ai-hint="medical stethoscope" />;
        case 'WEIGHT':
            return <Scale {...props} data-ai-hint="weighing scale" />;
        case 'FEEDING':
            return <Soup {...props} data-ai-hint="food bowl" />;
        case 'BEHAVIOR':
            return <Eye {...props} data-ai-hint="eye icon" />;
        case 'LOCATION':
            return <MapPin {...props} data-ai-hint="map location" />;
        case 'OTHER':
            return <ClipboardList {...props} data-ai-hint="clipboard notes" />;
        default:
            return <HelpCircle {...props} data-ai-hint="question mark" />;
    }
}
