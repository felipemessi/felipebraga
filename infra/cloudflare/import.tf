# The zone was created in the Cloudflare dashboard before Terraform managed it,
# so the first plan imports it instead of creating a second one. The ID is not
# a secret. Once the zone is in the state this block does nothing and can stay.
import {
  to = cloudflare_zone.site[0]
  id = "38dc112c823526cd6d2e11d553f25709"
}
