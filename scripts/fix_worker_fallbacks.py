code = open('functions/api/[[path]].ts', 'r').read()

old_ebay = "const verificationToken = env.EBAY_DELETION_VERIFICATION_TOKEN || 'apex_ebay_verification_token_2026';"
new_ebay = """const verificationToken = env.EBAY_DELETION_VERIFICATION_TOKEN;
      if (!verificationToken) {
        return json({ error: 'Server configuration error: EBAY_DELETION_VERIFICATION_TOKEN environment variable is not configured.' }, 500);
      }"""

if old_ebay in code:
    code = code.replace(old_ebay, new_ebay)
    print("Fixed eBay token fallback.")

old_routing = """    } catch (err) {
      // Fallback straight-line navigation if OSRM is unreachable
      return json({
        distanceMiles: 2.4,
        durationMinutes: 5,
        coordinates: [{ latitude: startLat, longitude: startLng }, { latitude: destLat, longitude: destLng }],
        steps: [{ instruction: 'Head toward destination', distanceMiles: 2.4, street: 'Destination Route' }]
      });
    }"""

new_routing = """    } catch (err: any) {
      return json({ error: `Routing failed: ${err?.message || 'Routing service unavailable'}` }, 502);
    }"""

if old_routing in code:
    code = code.replace(old_routing, new_routing)
    print("Fixed routing fake fallback.")

open('functions/api/[[path]].ts', 'w').write(code)
