import { IsString } from 'class-validator';

/**
 * The body of a "show me this as a member" request.
 *
 * A real DTO class rather than an inline `@Body() { credential }` type, because
 * the global ValidationPipe (main.ts) runs with `whitelist: true` and validates
 * only against decorated class properties — an undecorated shape is the kind of
 * thing that works today and silently starts dropping a field the moment
 * someone tightens the pipe.
 *
 * `credential` is REQUIRED and there is deliberately no typed-email fallback.
 * The enrolment flow tolerates one because a typed address there only affects
 * what somebody is charged; here it would be the whole gate — anybody who knew
 * a member's address could read what that member paid for. On a deployment with
 * no GOOGLE_CLIENT_ID configured there is simply no member view, which is the
 * safe way for that deployment to be wrong.
 */
export class MemberViewDto {
  @IsString()
  credential!: string;
}
