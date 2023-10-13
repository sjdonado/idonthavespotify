const CustomMetaTag = (props: { property: string; content: string }) => (
  // eslint-disable-next-line
  // @ts-ignore
  <meta property={props.property} content={props.content} />
);

export default CustomMetaTag;
