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
import type { RecordType } from '@/lib/types';

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
        case 'Health Check':
            return <Stethoscope {...props} data-ai-hint="medical stethoscope" />;
        case 'Growth':
            return <Scale {...props} data-ai-hint="weighing scale" />;
        case 'Feeding':
            return <Soup {...props} data-ai-hint="food bowl" />;
        case 'Sighting':
            return <Eye {...props} data-ai-hint="eye icon" />;
        case 'Release':
            return <MapPin {...props} data-ai-hint="map location" />;
        case 'General':
            return <ClipboardList {...props} data-ai-hint="clipboard notes" />;
        default:
            return <HelpCircle {...props} data-ai-hint="question mark" />;
    }
}
