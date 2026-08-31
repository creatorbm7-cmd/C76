// V2JungleBackdrop — now the shared C74 rich-green backdrop.
//
// The old "Living Jungle" scene was retired to a no-op; the app has since moved
// to a single bright rich-green canvas. Rather than render nothing, this points
// at the shared JungleBackdrop so the V2 pages (Casino, Wallet, Rewards, Profile)
// match the rest of the app with zero call-site changes.
export { default } from "@/components/c7/JungleBackdrop";
