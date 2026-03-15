import { Phone, Star, Calendar, Building2 } from 'lucide-react';
import { Badge, Card, CardContent } from '@protolabsai/ui/atoms';
import type { Vendor, VendorCategory } from '@protolabsai/types';

const CATEGORY_LABELS: Record<VendorCategory, string> = {
  plumber: 'Plumber',
  electrician: 'Electrician',
  hvac: 'HVAC',
  landscaper: 'Landscaper',
  'general-contractor': 'General Contractor',
  painter: 'Painter',
  roofer: 'Roofer',
  'pest-control': 'Pest Control',
  cleaning: 'Cleaning',
  insurance: 'Insurance',
  other: 'Other',
};

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 'brand';

const CATEGORY_BADGE_VARIANTS: Record<VendorCategory, BadgeVariant> = {
  plumber: 'info',
  electrician: 'warning',
  hvac: 'brand',
  landscaper: 'success',
  'general-contractor': 'muted',
  painter: 'muted',
  roofer: 'muted',
  'pest-control': 'error',
  cleaning: 'success',
  insurance: 'muted',
  other: 'muted',
};

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating ? 'fill-status-warning text-status-warning' : 'text-muted-foreground'
          }`}
        />
      ))}
    </div>
  );
}

function formatLastService(dateStr: string | null): string {
  if (!dateStr) return 'No service history';
  const date = new Date(dateStr);
  return `Last service: ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

interface VendorCardProps {
  vendor: Vendor;
  onClick: (vendor: Vendor) => void;
}

export function VendorCard({ vendor, onClick }: VendorCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onClick(vendor)}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Name + company */}
        <div>
          <p className="font-semibold text-foreground leading-tight">{vendor.name}</p>
          {vendor.company && (
            <div className="flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground truncate">{vendor.company}</p>
            </div>
          )}
        </div>

        {/* Category badge */}
        <Badge variant={CATEGORY_BADGE_VARIANTS[vendor.category]} className="w-fit text-xs">
          {CATEGORY_LABELS[vendor.category]}
        </Badge>

        {/* Phone */}
        <a
          href={`tel:${vendor.phone}`}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline w-fit"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-3.5 w-3.5 shrink-0" />
          {vendor.phone}
        </a>

        {/* Rating */}
        {vendor.rating !== null && <StarRating rating={vendor.rating} />}

        {/* Last service */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          {formatLastService(vendor.lastServiceDate)}
        </div>
      </CardContent>
    </Card>
  );
}
