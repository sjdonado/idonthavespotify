export default function CustomMetaTag(props: { property: string; content: string }) {
  // eslint-disable-next-line
  // @ts-ignore
  return <meta property={props.property} content={props.content} />;
}
