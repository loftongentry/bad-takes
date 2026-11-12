// Sound files bundled with the app (Metro turns each import into an asset reference)
declare module "*.wav" {
  const asset: number;
  export default asset;
}
