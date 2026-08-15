-- PostGIS helper routines are not application RPCs.
revoke all on function public.st_estimatedextent(text, text) from public, anon, authenticated;
revoke all on function public.st_estimatedextent(text, text, text) from public, anon, authenticated;
revoke all on function public.st_estimatedextent(text, text, text, boolean) from public, anon, authenticated;
